const crypto = require('crypto')
const fs = require('fs')
const path = require('path')
const readline = require('readline')
const { spawn, spawnSync } = require('child_process')
const { shell } = require('electron')
const { getYakitHome, loadExtraFilePath } = require('../filePath')
const {
  getTaskbarIconPresetFileName,
  makeTaskbarIconKey,
  makeAppUserModelId,
  normalizeChromeFlags,
  quoteWindowsArgument,
} = require('./windowsChromeTaskbarUtils')

const HELPER_PROTOCOL_VERSION = 2
const HELPER_FILE_NAME = 'yakit-chrome-launcher.exe'
const validatedHelpers = new Set()
const buildProxyExtension = ({ directory, host, port, username, password }) => {
  fs.mkdirSync(directory, { recursive: true })
  const manifest = {
    version: '1.0.0',
    manifest_version: 2,
    name: 'YakitProxy',
    permissions: ['proxy', 'tabs', 'unlimitedStorage', 'storage', '<all_urls>', 'webRequest', 'webRequestBlocking'],
    background: { scripts: ['background.js'] },
    minimum_chrome_version: '22.0.0',
  }
  const proxyConfig = JSON.stringify({
    mode: 'fixed_servers',
    rules: { singleProxy: { scheme: 'http', host, port } },
  })
  const credentials = JSON.stringify({ username, password })
  const background = [
    `chrome.proxy.settings.set({ value: ${proxyConfig}, scope: 'regular' }, function() {});`,
    `function callbackFn() { return { authCredentials: ${credentials} }; }`,
    "chrome.webRequest.onAuthRequired.addListener(callbackFn, { urls: ['<all_urls>'] }, ['blocking']);",
    '',
  ].join('\n')
  fs.writeFileSync(path.join(directory, 'manifest.json'), JSON.stringify(manifest, null, 2))
  fs.writeFileSync(path.join(directory, 'background.js'), background)
}

const getHelperPath = () =>
  process.env.YAKIT_CHROME_LAUNCHER_PATH || loadExtraFilePath(path.join('bins', HELPER_FILE_NAME))

const validateHelper = (helperPath) => {
  if (!fs.existsSync(helperPath)) {
    throw new Error(`Windows Chrome launcher helper was not found: ${helperPath}`)
  }
  if (validatedHelpers.has(helperPath)) return
  const result = spawnSync(helperPath, ['capabilities'], { encoding: 'utf8', windowsHide: true })
  if (result.error || result.status !== 0) {
    throw result.error || new Error(`Windows Chrome launcher capability check failed: ${result.stderr}`)
  }
  let capabilities
  try {
    capabilities = JSON.parse(result.stdout)
  } catch (error) {
    throw new Error(`Windows Chrome launcher returned invalid capabilities: ${result.stdout}`)
  }
  if (!capabilities.ok || capabilities.protocolVersion !== HELPER_PROTOCOL_VERSION) {
    throw new Error(
      `Unsupported Windows Chrome launcher protocol: ${capabilities.protocolVersion}; expected ${HELPER_PROTOCOL_VERSION}`,
    )
  }
  validatedHelpers.add(helperPath)
}

const writeShortcut = ({ shortcutPath, chromePath, chromeArguments, iconPath, appUserModelId }) => {
  const operation = fs.existsSync(shortcutPath) ? 'replace' : 'create'
  const written = shell.writeShortcutLink(shortcutPath, operation, {
    target: chromePath,
    cwd: path.dirname(chromePath),
    args: chromeArguments.map(quoteWindowsArgument).join(' '),
    description: 'Chrome launched by Yakit',
    icon: iconPath,
    iconIndex: 0,
    appUserModelId,
  })
  if (!written) throw new Error(`Failed to write Chrome shortcut: ${shortcutPath}`)
}

const launchWithHelper = ({ helperPath, shortcutPath, chromePath, appUserModelId, iconPath }) => {
  const child = spawn(
    helperPath,
    [
      'watch',
      '--shortcut',
      shortcutPath,
      '--exe',
      chromePath,
      '--aumid',
      appUserModelId,
      '--icon',
      iconPath,
      '--timeout-ms',
      '20000',
    ],
    { windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] },
  )

  let attached = false
  let settled = false
  let stderr = ''
  let resolveExit
  let resolveClosed
  let closedSettled = false
  const exitPromise = new Promise((resolve) => {
    resolveExit = resolve
  })
  const closedPromise = new Promise((resolve) => {
    resolveClosed = resolve
  })

  const readyPromise = new Promise((resolve, reject) => {
    const settleError = (error) => {
      if (settled) return
      settled = true
      reject(error)
    }
    const lines = readline.createInterface({ input: child.stdout })
    lines.on('line', (line) => {
      let event
      try {
        event = JSON.parse(line)
      } catch (error) {
        settleError(new Error(`Invalid response from Windows Chrome launcher: ${line}`))
        return
      }
      if (event.event === 'fatal') {
        settleError(new Error(event.message || 'Windows Chrome launcher failed'))
      }
      if (event.event === 'windows-closed' && !closedSettled) {
        closedSettled = true
        resolveClosed(event)
      }
      if (event.event === 'window-attached' && !attached) {
        attached = true
        settled = true
        resolve({ pid: event.pid, hwnd: event.hwnd, appUserModelId, child, exitPromise, closedPromise })
      }
    })
    child.stderr.on('data', (data) => {
      stderr += data.toString()
    })
    child.once('error', settleError)
    child.once('exit', (code, signal) => {
      lines.close()
      resolveExit({ code, signal })
      if (!closedSettled) {
        closedSettled = true
        resolveClosed({ event: 'process-exited', confirmed: false, code, signal })
      }
      if (!attached) {
        settleError(
          new Error(
            `Windows Chrome launcher exited before attaching to a window (code=${code}, signal=${signal})${
              stderr ? `: ${stderr.trim()}` : ''
            }`,
          ),
        )
      }
    })
  })

  return readyPromise
}

const launchWindowsChrome = async (params) => {
  const helperPath = getHelperPath()
  validateHelper(helperPath)

  if (typeof params.chromePath !== 'string' || params.chromePath.trim().length === 0) {
    throw new Error('Chrome executable path is required')
  }
  const chromePath = path.resolve(params.chromePath)
  const suppliedProfile = typeof params.userDataDir === 'string' && params.userDataDir.trim().length > 0
  const instanceId = suppliedProfile
    ? crypto.createHash('sha256').update(path.resolve(params.userDataDir).toLowerCase()).digest('hex').slice(0, 16)
    : crypto.randomUUID()
  const userDataDir = suppliedProfile
    ? path.resolve(params.userDataDir)
    : path.join(getYakitHome(), 'chrome-profile-temp', instanceId)
  const runtimeDirectory = path.join(getYakitHome(), 'chrome-taskbar', instanceId)
  const extensionDirectory = path.join(runtimeDirectory, 'proxy-extension')
  const shortcutPath = path.join(runtimeDirectory, 'Yakit Chrome.lnk')
  const customIconPath =
    typeof params.taskbarIconPath === 'string' && params.taskbarIconPath.trim().length > 0
      ? path.resolve(params.taskbarIconPath)
      : null
  const presetFileName = getTaskbarIconPresetFileName(params.taskbarIconPreset)
  const requestedIconPath = customIconPath
    ? customIconPath
    : presetFileName
      ? loadExtraFilePath(path.join('bins', 'chrome-taskbar-icons', presetFileName))
      : null
  const appUserModelId = makeAppUserModelId(userDataDir)
  const taskbarIconKey = makeTaskbarIconKey(params.taskbarIconPreset, customIconPath)

  if (!fs.existsSync(chromePath)) throw new Error(`Chrome executable was not found: ${chromePath}`)
  if (requestedIconPath && !fs.existsSync(requestedIconPath)) {
    throw new Error(`Taskbar icon resource was not found: ${requestedIconPath}`)
  }
  if (requestedIconPath && !['.ico', '.exe', '.dll'].includes(path.extname(requestedIconPath).toLowerCase())) {
    throw new Error('Taskbar icon resource must be an ICO, EXE, or DLL file')
  }
  fs.mkdirSync(runtimeDirectory, { recursive: true })
  fs.mkdirSync(userDataDir, { recursive: true })
  const iconPath = requestedIconPath
    ? path.join(runtimeDirectory, `taskbar-icon${path.extname(requestedIconPath).toLowerCase()}`)
    : process.execPath
  if (requestedIconPath && requestedIconPath.toLowerCase() !== iconPath.toLowerCase()) {
    fs.copyFileSync(requestedIconPath, iconPath)
  }

  const chromeArguments = [
    `--proxy-server=http://${params.host}:${params.port}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--new-window',
    '--disable-background-mode',
    ...normalizeChromeFlags(params.chromeFlags),
  ]
  if (params.username && params.password) {
    buildProxyExtension({
      directory: extensionDirectory,
      host: params.host,
      port: params.port,
      username: params.username,
      password: params.password,
    })
    chromeArguments.unshift(
      `--disable-extensions-except=${extensionDirectory}`,
      `--load-extension=${extensionDirectory}`,
    )
  }
  chromeArguments.push(
    `--user-data-dir=${userDataDir}`,
    '--profile-directory=Default',
    params.startingUrl || 'chrome://newtab',
  )

  writeShortcut({ shortcutPath, chromePath, chromeArguments, iconPath, appUserModelId })
  const launched = await launchWithHelper({ helperPath, shortcutPath, chromePath, appUserModelId, iconPath })

  const cleanUp = () => {
    if (fs.existsSync(extensionDirectory)) fs.rmSync(extensionDirectory, { recursive: true, force: true })
  }
  launched.exitPromise.finally(cleanUp)
  return {
    ...launched,
    identity: path.resolve(userDataDir).toLowerCase(),
    taskbarIconKey,
    close: () => {
      if (!launched.child.killed && launched.child.stdin.writable) {
        launched.child.stdin.write('close\n')
        return launched.closedPromise
      }
      return Promise.reject(new Error('Windows Chrome launcher is not available'))
    },
    detach: () => {
      if (!launched.child.killed && launched.child.stdin.writable) launched.child.stdin.write('detach\n')
    },
  }
}

module.exports = {
  HELPER_PROTOCOL_VERSION,
  buildProxyExtension,
  launchWindowsChrome,
}

const fs = require('fs')
const path = require('path')
const os = require('os')
const { spawn, execFileSync } = require('child_process')
const asar = require('@electron/asar')

function findAsar(dir, depth = 0) {
  if (depth > 5) return []
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(dir, entry.name)
    if (entry.isDirectory() && !['ci-artifacts', 'node_modules'].includes(entry.name)) return findAsar(file, depth + 1)
    return entry.name === 'app.asar' ? [file] : []
  })
}

function executable(archive) {
  const root = path.dirname(path.dirname(archive))
  if (process.platform === 'darwin') {
    const macos = path.join(root, 'MacOS')
    const files = fs.readdirSync(macos)
    if (files.length !== 1) throw new Error('Ambiguous Mac executable')
    return path.join(macos, files[0])
  }
  const files = fs
    .readdirSync(root)
    .filter((name) =>
      process.platform === 'win32'
        ? name.endsWith('.exe')
        : !name.includes('.') &&
          !name.startsWith('chrome') &&
          fs.statSync(path.join(root, name)).isFile() &&
          fs.statSync(path.join(root, name)).mode & 0o111,
    )
  if (files.length !== 1) throw new Error('Ambiguous packaged executable: ' + files.join(', '))
  return path.join(root, files[0])
}

function stop(child) {
  if (!child.pid || child.exitCode !== null) return
  if (process.platform === 'win32') {
    try {
      execFileSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore' })
    } catch (_) {}
  } else {
    try {
      process.kill(-child.pid, 'SIGKILL')
    } catch (_) {}
  }
}

function logErrors(dir) {
  if (!fs.existsSync(dir)) return ''
  let text = ''
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name)
    if (entry.isDirectory()) text += logErrors(file)
    else if (/\.log(?:\.|$)/.test(entry.name) && fs.statSync(file).size < 2 * 1024 * 1024)
      text += fs.readFileSync(file, 'utf8')
  }
  return text
}

async function smoke(exe, temp) {
  const env = {
    ...process.env,
    YAKIT_HOME: path.join(temp, 'workspace'),
    NODE_OPTIONS: '',
    ELECTRON_ENABLE_LOGGING: '1',
  }
  delete env.ELECTRON_RUN_AS_NODE
  const args = ['--user-data-dir=' + path.join(temp, 'user-data')]
  if (process.platform === 'linux') args.push('--no-sandbox')
  await new Promise((resolve, reject) => {
    const child = spawn(exe, args, { env, stdio: ['ignore', 'pipe', 'pipe'], detached: process.platform !== 'win32' })
    let output = ''
    let loaded = false
    let settled = false
    let readyTimer
    const timeout = setTimeout(
      () => finish(new Error('Packaged app did not load its startup page within 90 seconds\n' + output.slice(-12000))),
      90000,
    )
    function finish(error) {
      if (settled) return
      settled = true
      clearTimeout(timeout)
      clearTimeout(readyTimer)
      stop(child)
      if (error) reject(error)
      else resolve()
    }
    function capture(data) {
      output = (output + data.toString()).slice(-100000)
      if (/cachedDataRejected|Uncaught Exception|uncaughtException|did-fail-load|render-process-gone/.test(output))
        return finish(new Error('Packaged startup failed\n' + output.slice(-12000)))
      if (!loaded && output.includes('[engineLinkWin] did-finish-load, URL: file:')) {
        loaded = true
        readyTimer = setTimeout(() => {
          const logs = logErrors(path.join(temp, 'workspace'))
          if (/uncaughtException|did-fail-load|render-process-gone/.test(logs))
            finish(new Error('Packaged startup log contains an error\n' + logs.slice(-12000)))
          else finish()
        }, 5000)
      }
    }
    child.stdout.on('data', capture)
    child.stderr.on('data', capture)
    child.on('error', finish)
    child.on('exit', (code) => {
      if (!settled)
        finish(new Error('Packaged app exited before startup verification: ' + code + '\n' + output.slice(-12000)))
    })
  })
  console.log('Packaged startup page loaded and remained alive for 5 seconds')
}

async function main() {
  const root = path.resolve(process.argv[2] || 'release')
  const archives = findAsar(root)
  if (archives.length !== 1) throw new Error('Expected exactly one packaged app, found ' + archives.length)
  const archive = archives[0]
  const pkg = JSON.parse(asar.extractFile(archive, 'package.json').toString())
  if (pkg.version !== process.env.BUILD_VERSION) throw new Error('Embedded package version mismatch: ' + pkg.version)
  const exe = executable(archive)
  const tempRoot = fs.realpathSync(os.tmpdir())
  const temp = fs.mkdtempSync(path.join(tempRoot, 'desktop-build-check-'))
  try {
    if (process.env.BUILD_EDITION === 'memfit') {
      if (pkg.main !== 'app/main-bytecode/index.js')
        throw new Error('Packaged AI Senso must use the bytecode entry point')
      const bytecode = path.join(temp, 'bytecode')
      const entries = asar.listPackage(archive)
      if (entries.some((file) => /^[/\\]app[/\\]main[/\\].*\.js$/.test(file)))
        throw new Error('Plaintext main process found in AI Senso package')
      for (const entry of entries.filter((file) => file.endsWith('.jsc'))) {
        const relative = entry.replace(/^[/\\]/, '')
        const dest = path.join(bytecode, relative)
        fs.mkdirSync(path.dirname(dest), { recursive: true })
        fs.writeFileSync(dest, asar.extractFile(archive, relative))
      }
      execFileSync(exe, [path.join(__dirname, 'verify-bytecode-runtime.js'), bytecode], {
        timeout: 60000,
        stdio: 'inherit',
        env: {
          ...process.env,
          ELECTRON_RUN_AS_NODE: '1',
          NODE_OPTIONS: '',
          EXPECTED_ELECTRON: require('../package.json').devDependencies.electron,
          EXPECTED_ARCH: process.env.BUILD_TARGET_ARCH,
        },
      })
    }
    await smoke(exe, temp)
  } finally {
    if (path.dirname(path.resolve(temp)) !== tempRoot || !path.basename(temp).startsWith('desktop-build-check-')) {
      throw new Error('Refusing to clean up an unexpected temporary path')
    }
    fs.rmSync(temp, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 })
  }
}

if (require.main === module)
  main().catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
module.exports = { findAsar, executable }

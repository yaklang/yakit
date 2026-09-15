const childProcess = require('child_process')
const crypto = require('crypto')
const fs = require('fs')
const path = require('path')
const treeKill = require('tree-kill')

const PROFILE_STORE_VERSION = 1
const MAX_MANAGED_PROFILES = 8
const MAX_PROFILE_STORE_BYTES = 1024 * 1024
const PROFILE_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const PROFILE_NAME_CONTROL_PATTERN = /[\u0000-\u001f\u007f]/g
const PROFILE_NAME_CONTROL_TEST_PATTERN = /[\u0000-\u001f\u007f]/
const YAKIT_BROWSER_AGENT_EXTENSION_ID = 'mcnaombmlombekhbonfndagbcfhmoail'

const IPC_CHANNELS = {
  defaults: 'GetManagedBrowserProfileDefaults',
  list: 'ListManagedBrowserProfiles',
  create: 'CreateManagedBrowserProfile',
  bind: 'BindManagedBrowserProfile',
  launch: 'LaunchManagedBrowserProfile',
  stop: 'StopManagedBrowserProfile',
  remove: 'RemoveManagedBrowserProfile',
}

function normalizeManagedProfileName(value) {
  const normalized = `${value || ''}`.replace(PROFILE_NAME_CONTROL_PATTERN, ' ').replace(/\s+/g, ' ').trim()
  if (!normalized) throw new Error('测试身份名称不能为空')
  return normalized.slice(0, 80)
}

function normalizeManagedProfileTarget(value) {
  const normalized = `${value || ''}`.trim()
  if (!normalized) return 'chrome://newtab/'
  if (normalized.length > 8192) throw new Error('目标页面 URL 过长')
  let parsed
  try {
    parsed = new URL(normalized)
  } catch (error) {
    throw new Error('目标页面 URL 无效')
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('目标页面只允许 HTTP(S) URL')
  }
  if (parsed.username || parsed.password) {
    throw new Error('目标页面 URL 不能包含账号或密码')
  }
  return parsed.toString()
}

function realDirectory(fsApi, rawPath, label) {
  const value = `${rawPath || ''}`.trim()
  if (!value || !path.isAbsolute(value)) throw new Error(`${label}必须是绝对目录`)
  if (value.includes('\u0000') || value.includes(',')) {
    throw new Error(`${label}包含 Chrome 不支持的字符`)
  }
  const resolved = fsApi.realpathSync(value)
  if (!fsApi.statSync(resolved).isDirectory()) throw new Error(`${label}不是目录`)
  return resolved
}

function validateManagedExtensionPath(fsApi, rawPath) {
  const extensionPath = realDirectory(fsApi, rawPath, '浏览器插件目录')
  const manifestPath = path.join(extensionPath, 'manifest.json')
  if (!fsApi.existsSync(manifestPath) || !fsApi.statSync(manifestPath).isFile()) {
    throw new Error('浏览器插件目录缺少 manifest.json')
  }
  let manifest
  try {
    const raw = fsApi.readFileSync(manifestPath, 'utf8')
    if (Buffer.byteLength(raw, 'utf8') > 512 * 1024) {
      throw new Error('manifest.json 过大')
    }
    manifest = JSON.parse(raw)
  } catch (error) {
    throw new Error(`浏览器插件 manifest.json 无效：${error.message}`)
  }
  const manifestName = `${manifest?.name || ''}`
  if (
    manifest?.manifest_version !== 3 ||
    (!/yakit browser agent/i.test(manifestName) && manifestName !== '__MSG_extName__') ||
    !Array.isArray(manifest.permissions) ||
    !manifest.permissions.includes('tabs') ||
    !manifest.permissions.includes('cookies') ||
    !manifest.permissions.includes('storage')
  ) {
    throw new Error('所选目录不是可用的 Yakit Browser Agent Chromium 构建')
  }
  return extensionPath
}

function validateChromeExecutable(fsApi, rawPath) {
  const value = `${rawPath || ''}`.trim()
  if (!value || !path.isAbsolute(value)) throw new Error('Chromium 可执行文件必须是绝对路径')
  if (value.includes('\u0000')) throw new Error('Chromium 可执行文件路径无效')
  const resolved = fsApi.realpathSync(value)
  if (!fsApi.statSync(resolved).isFile()) throw new Error('Chromium 可执行文件不存在')
  return resolved
}

function isProcessAlive(pid) {
  if (!Number.isSafeInteger(pid) || pid <= 0) return false
  try {
    process.kill(pid, 0)
    return true
  } catch (error) {
    return error?.code === 'EPERM'
  }
}

function defaultChromePathResolver() {
  const environmentPath = process.env.CHROME_PATH || process.env.LIGHTHOUSE_CHROMIUM_PATH
  if (environmentPath) return environmentPath
  if (process.platform === 'darwin') {
    const candidates = [
      '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Chromium.app/Contents/MacOS/Chromium',
    ]
    const existing = candidates.find((candidate) => fs.existsSync(candidate))
    if (existing) return existing
  }
  const { getChromePath } = require('chrome-launcher')
  return getChromePath()
}

function stopProcessTree(pid) {
  return new Promise((resolve, reject) => {
    treeKill(pid, 'SIGTERM', (error) => {
      if (error && error.code !== 'ESRCH') {
        reject(error)
        return
      }
      resolve()
    })
  })
}

function waitForSpawn(child) {
  return new Promise((resolve, reject) => {
    const onSpawn = () => {
      child.removeListener('error', onError)
      resolve()
    }
    const onError = (error) => {
      child.removeListener('spawn', onSpawn)
      reject(error)
    }
    child.once('spawn', onSpawn)
    child.once('error', onError)
  })
}

function buildManagedChromeArguments(record, userDataDir, showExtensionPage) {
  const badge = record.slotHint === 'right' ? 'B' : 'A'
  const bootstrap = new URL(`chrome-extension://${YAKIT_BROWSER_AGENT_EXTENSION_ID}/ytray-bootstrap.html`)
  bootstrap.searchParams.set('manager', 'yakit')
  bootstrap.searchParams.set('instanceId', record.id)
  bootstrap.searchParams.set('badge', badge)
  bootstrap.searchParams.set('target', record.startingUrl)
  bootstrap.searchParams.set('restore', '0')
  const args = [
    `--user-data-dir=${userDataDir}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-sync',
    '--new-window',
    `--load-extension=${record.extensionPath}`,
    bootstrap.toString(),
  ]
  if (showExtensionPage || !record.lastStartedAt) args.push('chrome://extensions/')
  return args
}

class ManagedBrowserProfileManager {
  constructor(options) {
    if (!options?.rootDir) throw new Error('managed browser profile root is required')
    this.fs = options.fs || fs
    this.rootDir = path.resolve(options.rootDir)
    this.profilesDir = path.join(this.rootDir, 'profiles')
    this.storePath = path.join(this.rootDir, 'profiles.json')
    this.now = options.now || (() => Date.now())
    this.randomUUID = options.randomUUID || (() => crypto.randomUUID())
    this.spawnProcess =
      options.spawnProcess ||
      ((executable, args) =>
        childProcess.spawn(executable, args, {
          detached: false,
          stdio: 'ignore',
          windowsHide: false,
        }))
    this.processAlive = options.processAlive || isProcessAlive
    this.stopTree = options.stopTree || stopProcessTree
    this.chromePathResolver = options.chromePathResolver || defaultChromePathResolver
    this.sessionId = this.randomUUID()
    this.processes = new Map()
    this.fs.mkdirSync(this.profilesDir, { recursive: true })
    this.records = this.readStore()
  }

  readStore() {
    if (!this.fs.existsSync(this.storePath)) return []
    try {
      const stat = this.fs.statSync(this.storePath)
      if (!stat.isFile() || stat.size > MAX_PROFILE_STORE_BYTES) return []
      const parsed = JSON.parse(this.fs.readFileSync(this.storePath, 'utf8'))
      if (parsed?.version !== PROFILE_STORE_VERSION || !Array.isArray(parsed.profiles)) return []
      return parsed.profiles.slice(0, MAX_MANAGED_PROFILES).flatMap((record) => {
        if (
          !record ||
          !PROFILE_ID_PATTERN.test(`${record.id || ''}`) ||
          !['left', 'right'].includes(record.slotHint) ||
          typeof record.name !== 'string' ||
          typeof record.extensionPath !== 'string' ||
          typeof record.chromePath !== 'string' ||
          typeof record.startingUrl !== 'string'
        ) {
          return []
        }
        try {
          return [
            {
              version: PROFILE_STORE_VERSION,
              id: record.id,
              slotHint: record.slotHint,
              name: normalizeManagedProfileName(record.name),
              extensionPath: record.extensionPath,
              chromePath: record.chromePath,
              startingUrl: normalizeManagedProfileTarget(record.startingUrl),
              createdAt: Number.isSafeInteger(record.createdAt) ? record.createdAt : this.now(),
              updatedAt: Number.isSafeInteger(record.updatedAt) ? record.updatedAt : this.now(),
              lastStartedAt: Number.isSafeInteger(record.lastStartedAt) ? record.lastStartedAt : undefined,
              installationId:
                typeof record.installationId === 'string' && record.installationId.length <= 256
                  ? record.installationId
                  : undefined,
              pid: Number.isSafeInteger(record.pid) && record.pid > 0 ? record.pid : undefined,
              ownerSessionId: typeof record.ownerSessionId === 'string' ? record.ownerSessionId : undefined,
            },
          ]
        } catch (error) {
          return []
        }
      })
    } catch (error) {
      return []
    }
  }

  writeStore() {
    this.fs.mkdirSync(this.rootDir, { recursive: true })
    const temporaryPath = `${this.storePath}.${process.pid}.${crypto.randomBytes(6).toString('hex')}.tmp`
    this.fs.writeFileSync(
      temporaryPath,
      JSON.stringify(
        {
          version: PROFILE_STORE_VERSION,
          profiles: this.records,
        },
        null,
        2,
      ),
      { encoding: 'utf8', mode: 0o600 },
    )
    this.fs.renameSync(temporaryPath, this.storePath)
  }

  profileDirectory(id) {
    if (!PROFILE_ID_PATTERN.test(`${id || ''}`)) throw new Error('测试身份 ID 无效')
    return path.join(this.profilesDir, id)
  }

  assertProfileDirectory(record) {
    const userDataDir = this.profileDirectory(record.id)
    if (!this.fs.existsSync(userDataDir)) throw new Error('独立 Profile 目录已被外部删除')
    const stat = this.fs.lstatSync(userDataDir)
    if (!stat.isDirectory() || stat.isSymbolicLink()) {
      throw new Error('独立 Profile 目录不是受管实体目录')
    }
    const realRoot = this.fs.realpathSync(this.profilesDir)
    const realUserDataDir = this.fs.realpathSync(userDataDir)
    const relative = path.relative(realRoot, realUserDataDir)
    if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) {
      throw new Error('测试身份目录超出受管范围')
    }
    return realUserDataDir
  }

  record(id) {
    const normalized = `${id || ''}`.trim()
    const record = this.records.find((candidate) => candidate.id === normalized)
    if (!record) throw new Error('测试身份不存在')
    return record
  }

  status(record) {
    const current = this.processes.get(record.id)
    if (
      current &&
      record.ownerSessionId === this.sessionId &&
      record.pid === current.pid &&
      this.processAlive(record.pid)
    ) {
      return 'running'
    }
    if (record.pid && this.processAlive(record.pid)) return 'detached'
    return 'stopped'
  }

  view(record) {
    return {
      version: PROFILE_STORE_VERSION,
      id: record.id,
      slotHint: record.slotHint,
      name: record.name,
      status: this.status(record),
      userDataDir: this.profileDirectory(record.id),
      extensionPath: record.extensionPath,
      chromePath: record.chromePath,
      startingUrl: record.startingUrl,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      lastStartedAt: record.lastStartedAt,
      installationId: record.installationId,
      pid: record.pid,
    }
  }

  refreshStoppedRecords() {
    let changed = false
    for (const record of this.records) {
      if (record.pid && !this.processAlive(record.pid)) {
        record.pid = undefined
        record.ownerSessionId = undefined
        record.updatedAt = this.now()
        this.processes.delete(record.id)
        changed = true
      }
    }
    if (changed) this.writeStore()
  }

  list() {
    this.refreshStoppedRecords()
    return this.records
      .slice()
      .sort((left, right) => left.createdAt - right.createdAt)
      .map((record) => this.view(record))
  }

  defaults() {
    let chromePath = ''
    try {
      const candidate = this.chromePathResolver()
      if (candidate) chromePath = validateChromeExecutable(this.fs, candidate)
    } catch (error) {
      chromePath = ''
    }
    let extensionPath = `${process.env.YAKIT_BROWSER_EXTENSION_PATH || ''}`.trim()
    if (!extensionPath) {
      extensionPath =
        this.records
          .slice()
          .sort((left, right) => (right.updatedAt || 0) - (left.updatedAt || 0))
          .find((record) => this.fs.existsSync(record.extensionPath))?.extensionPath || ''
    }
    try {
      if (extensionPath) extensionPath = validateManagedExtensionPath(this.fs, extensionPath)
    } catch (error) {
      extensionPath = ''
    }
    return {
      version: PROFILE_STORE_VERSION,
      chromePath,
      extensionPath,
      profileRoot: this.profilesDir,
      maximumProfiles: MAX_MANAGED_PROFILES,
    }
  }

  create(input) {
    this.refreshStoppedRecords()
    if (this.records.length >= MAX_MANAGED_PROFILES) {
      throw new Error(`最多只能保留 ${MAX_MANAGED_PROFILES} 个独立测试身份`)
    }
    const slotHint = input?.slotHint === 'right' ? 'right' : 'left'
    const name = normalizeManagedProfileName(input?.name)
    const extensionPath = validateManagedExtensionPath(this.fs, input?.extensionPath)
    const chromeCandidate = `${input?.chromePath || ''}`.trim() || this.chromePathResolver()
    const chromePath = validateChromeExecutable(this.fs, chromeCandidate)
    const startingUrl = normalizeManagedProfileTarget(input?.startingUrl)
    const id = this.randomUUID()
    if (!PROFILE_ID_PATTERN.test(id)) throw new Error('无法生成安全的测试身份 ID')
    const userDataDir = this.profileDirectory(id)
    this.fs.mkdirSync(userDataDir, { recursive: false, mode: 0o700 })
    const now = this.now()
    const record = {
      version: PROFILE_STORE_VERSION,
      id,
      slotHint,
      name,
      extensionPath,
      chromePath,
      startingUrl,
      createdAt: now,
      updatedAt: now,
    }
    this.records.push(record)
    try {
      this.writeStore()
    } catch (error) {
      this.records = this.records.filter((candidate) => candidate.id !== id)
      this.fs.rmSync(userDataDir, { recursive: true, force: true })
      throw error
    }
    return this.view(record)
  }

  async openURL(record, url) {
    const userDataDir = this.assertProfileDirectory(record)
    const child = this.spawnProcess(record.chromePath, [`--user-data-dir=${userDataDir}`, url])
    await waitForSpawn(child)
    child.unref?.()
  }

  bind(id, installationId) {
    const record = this.record(id)
    const normalized = `${installationId || ''}`.trim()
    if (!normalized || normalized.length > 256 || PROFILE_NAME_CONTROL_TEST_PATTERN.test(normalized)) {
      throw new Error('插件安装身份无效')
    }
    const duplicate = this.records.find(
      (candidate) => candidate.id !== record.id && candidate.installationId === normalized,
    )
    if (duplicate) {
      throw new Error(`该插件安装已经关联到“${duplicate.name}”`)
    }
    record.installationId = normalized
    record.updatedAt = this.now()
    this.writeStore()
    return this.view(record)
  }

  async launch(id, options = {}) {
    this.refreshStoppedRecords()
    const record = this.record(id)
    const currentStatus = this.status(record)
    if (currentStatus === 'running') {
      if (options.showExtensionPage) await this.openURL(record, 'chrome://extensions/')
      return this.view(record)
    }
    if (currentStatus === 'detached') {
      if (options.showExtensionPage) {
        await this.openURL(record, 'chrome://extensions/')
        return this.view(record)
      }
      throw new Error('该测试身份由上一次 Yakit 会话启动；请先在浏览器中关闭该窗口')
    }
    record.extensionPath = validateManagedExtensionPath(this.fs, record.extensionPath)
    record.chromePath = validateChromeExecutable(this.fs, record.chromePath)
    const userDataDir = this.assertProfileDirectory(record)
    const showExtensionPage = options.showExtensionPage === true
    const args = buildManagedChromeArguments(record, userDataDir, showExtensionPage)
    const child = this.spawnProcess(record.chromePath, args)
    try {
      await waitForSpawn(child)
    } catch (error) {
      throw new Error(`启动 Chromium 失败：${error.message}`)
    }
    if (!Number.isSafeInteger(child.pid) || child.pid <= 0) {
      child.kill?.()
      throw new Error('Chromium 启动后没有返回有效进程 ID')
    }
    record.pid = child.pid
    record.ownerSessionId = this.sessionId
    record.lastStartedAt = this.now()
    record.updatedAt = record.lastStartedAt
    this.processes.set(record.id, child)
    this.writeStore()
    child.once('exit', () => {
      const latest = this.records.find((candidate) => candidate.id === record.id)
      if (latest && latest.ownerSessionId === this.sessionId && latest.pid === child.pid) {
        latest.pid = undefined
        latest.ownerSessionId = undefined
        latest.updatedAt = this.now()
        this.processes.delete(latest.id)
        try {
          this.writeStore()
        } catch (error) {
          console.error(`persist managed browser profile exit failed: ${error}`)
        }
      }
    })
    return this.view(record)
  }

  async stop(id) {
    this.refreshStoppedRecords()
    const record = this.record(id)
    const currentStatus = this.status(record)
    if (currentStatus === 'stopped') return this.view(record)
    if (currentStatus === 'detached') {
      throw new Error('该窗口不属于当前 Yakit 会话，请从浏览器中关闭后再刷新状态')
    }
    const pid = record.pid
    await this.stopTree(pid)
    const waitUntil = this.now() + 2_000
    while (this.processAlive(pid) && this.now() < waitUntil) {
      await new Promise((resolve) => setTimeout(resolve, 50))
    }
    if (this.processAlive(pid)) {
      throw new Error('浏览器仍在关闭中，请稍后刷新状态')
    }
    record.pid = undefined
    record.ownerSessionId = undefined
    record.updatedAt = this.now()
    this.processes.delete(record.id)
    this.writeStore()
    return this.view(record)
  }

  remove(id) {
    this.refreshStoppedRecords()
    const record = this.record(id)
    if (this.status(record) !== 'stopped') {
      throw new Error('请先关闭测试身份浏览器，再清理独立 Profile')
    }
    const userDataDir = this.assertProfileDirectory(record)
    this.fs.rmSync(userDataDir, {
      recursive: true,
      force: true,
      maxRetries: 3,
      retryDelay: 100,
    })
    this.records = this.records.filter((candidate) => candidate.id !== record.id)
    this.writeStore()
    return { removed: true, id: record.id }
  }
}

let sharedManager

function registerManagedBrowserProfileHandlers({ ipcMain, rootDir, assertTrustedAppSender }) {
  if (!ipcMain) throw new Error('ipcMain is required')
  if (!sharedManager) {
    const { getYakitHome } = require('../filePath')
    sharedManager = new ManagedBrowserProfileManager({
      rootDir: rootDir || path.join(getYakitHome(), 'browser-identities'),
    })
  }
  const trusted = (event, action) => {
    if (assertTrustedAppSender) assertTrustedAppSender(event, action)
  }
  const handle = (channel, callback) => {
    ipcMain.removeHandler(channel)
    ipcMain.handle(channel, async (event, ...args) => {
      trusted(event, channel)
      return callback(...args)
    })
  }
  handle(IPC_CHANNELS.defaults, () => sharedManager.defaults())
  handle(IPC_CHANNELS.list, () => sharedManager.list())
  handle(IPC_CHANNELS.create, (input) => sharedManager.create(input))
  handle(IPC_CHANNELS.bind, (input) => sharedManager.bind(input?.id, input?.installationId))
  handle(IPC_CHANNELS.launch, (input) =>
    sharedManager.launch(input?.id, {
      showExtensionPage: input?.showExtensionPage === true,
    }),
  )
  handle(IPC_CHANNELS.stop, (input) => sharedManager.stop(input?.id))
  handle(IPC_CHANNELS.remove, (input) => sharedManager.remove(input?.id))
  return sharedManager
}

module.exports = {
  IPC_CHANNELS,
  ManagedBrowserProfileManager,
  buildManagedChromeArguments,
  normalizeManagedProfileName,
  normalizeManagedProfileTarget,
  registerManagedBrowserProfileHandlers,
  validateManagedExtensionPath,
}

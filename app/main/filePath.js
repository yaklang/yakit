const { app } = require('electron')
const electronIsDev = require('electron-is-dev')
const os = require('os')
const path = require('path')
const process = require('process')
const fs = require('fs')

const DEFAULT_PROJECT_NAME = 'yakit-projects'

const DEFAULT_CONFIG = {
  YAKIT_HOME: '',
  language: 'zh-CN',
  workspaceHistory: [],
  autoStart: false,
}

// --- config.json 相关 ---

/**
 * 获取应用配置目录（只存放 config.json）
 * - Windows 打包: exe 所在目录
 * - macOS / Linux / 开发模式: app.getPath('userData')
 */
const getAppConfigDir = () => {
  try {
    if (process.platform === 'win32' && app.isPackaged) {
      return path.dirname(app.getPath('exe'))
    }
    return app.getPath('userData')
  } catch (e) {
    return path.join(os.homedir(), '.yakit')
  }
}

const getConfigPath = () => {
  return path.join(getAppConfigDir(), 'config.json')
}

/**
 * 读取 config.json，自愈：文件不存在/格式错误时返回默认值并尝试重建
 */
const getConfig = () => {
  const configPath = getConfigPath()
  try {
    const dir = path.dirname(configPath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    if (!fs.existsSync(configPath)) {
      fs.writeFileSync(configPath, JSON.stringify(DEFAULT_CONFIG, null, 2), 'utf8')
      return { ...DEFAULT_CONFIG }
    }
    const raw = fs.readFileSync(configPath, 'utf8')
    const parsed = JSON.parse(raw)
    return { ...DEFAULT_CONFIG, ...parsed }
  } catch (e) {
    console.log(`read config.json failed, using defaults: ${e}`)
    try {
      fs.writeFileSync(configPath, JSON.stringify(DEFAULT_CONFIG, null, 2), 'utf8')
    } catch (_) {}
    return { ...DEFAULT_CONFIG }
  }
}

/**
 * 写入配置项
 */
const setConfig = (key, value) => {
  const configPath = getConfigPath()
  try {
    const current = getConfig()
    current[key] = value
    const dir = path.dirname(configPath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    fs.writeFileSync(configPath, JSON.stringify(current, null, 2), 'utf8')
    return true
  } catch (e) {
    console.log(`write config.json failed: ${e}`)
    return false
  }
}

// --- 核心路径 getter ---

/**
 * 解析 YAKIT_HOME: 支持绝对路径和相对目录名
 * 优先级: config.json > 环境变量 YAKIT_HOME > 默认值
 */
const getYakitHome = () => {
  try {
    const config = getConfig()
    let homePath = config.YAKIT_HOME

    if (!homePath && process.env.YAKIT_HOME) {
      homePath = process.env.YAKIT_HOME
    }

    if (!homePath) {
      return _resolveDefaultProjectPath()
    }

    if (path.isAbsolute(homePath)) {
      _ensureDir(homePath)
      return homePath
    }

    const resolved = path.join(os.homedir(), homePath)
    _ensureDir(resolved)
    return resolved
  } catch (e) {
    console.log(`getYakitHome failed, using fallback: ${e}`)
    return path.join(os.homedir(), DEFAULT_PROJECT_NAME)
  }
}

/**
 * 兼容旧逻辑的默认路径解析
 * - Windows 打包: exe目录/yakit-projects
 * - 其他: ~/yakit-projects
 */
const _resolveDefaultProjectPath = () => {
  try {
    if (process.platform === 'win32' && app.isPackaged) {
      const appDir = path.dirname(app.getPath('exe'))
      const winPath = path.join(appDir, DEFAULT_PROJECT_NAME)
      _ensureDir(winPath)
      return winPath
    }
  } catch (e) {}
  const fallback = path.join(os.homedir(), DEFAULT_PROJECT_NAME)
  _ensureDir(fallback)
  return fallback
}

const _ensureDir = (dir) => {
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
  } catch (e) {}
}

// --- 派生路径 getter ---

const getYaklangEngineDir = () => path.join(getYakitHome(), 'yak-engine')

const getYakitInstallDir = () => path.join(os.homedir(), 'Downloads')

const getYakOnlineRagLatest = () => path.join(getYakitHome(), 'projects/libs/rag_files')

const getLocalYaklangEngine = () => {
  switch (process.platform) {
    case 'darwin':
    case 'linux':
      return path.join(getYaklangEngineDir(), 'yak')
    case 'win32':
      return path.join(getYaklangEngineDir(), 'yak.exe')
  }
}

const loadExtraFilePath = (s) => {
  if (electronIsDev) {
    return s
  }

  switch (os.platform()) {
    case 'darwin':
      return path.join(app.getAppPath(), '../..', s)
    case 'linux':
      return path.join(app.getAppPath(), '../..', s)
    case 'win32':
      return path.join(app.getAppPath(), '../..', s)
    default:
      return path.join(app.getAppPath(), s)
  }
}

const getBasicDir = () => path.join(getYakitHome(), 'base')
const getLocalCachePath = () => path.join(getBasicDir(), 'yakit-local.json')
const getExtraLocalCachePath = () => path.join(getBasicDir(), 'yakit-extra-local.json')

const getEngineLogDir = () => path.join(getYakitHome(), 'engine-log')
const getRenderLogDir = () => path.join(getYakitHome(), 'render-log')
const getPrintLogDir = () => path.join(getYakitHome(), 'print-log')

const getRemoteLinkDir = () => path.join(getYakitHome(), 'auth')
const getRemoteLinkFile = () => path.join(getRemoteLinkDir(), 'yakit-remote.json')

const getCodeDir = () => path.join(getYakitHome(), 'code')

const getHtmlTemplateDir = () => loadExtraFilePath(path.join('report'))

const getWindowStatePath = () => path.join(getBasicDir())

const getYakProjects = () => path.join(getYakitHome(), 'projects')

const getYakTemp = () => path.join(getYakitHome(), 'temp')

const getAiImageTemp = () => path.join(getYakitHome(), 'aiImageTemp')

// --- 启动时打印路径信息 ---
console.log(`---------- Global-Path Start ----------`)
console.log(`config-dir: ${getAppConfigDir()}`)
console.log(`config-path: ${getConfigPath()}`)
console.log(`yakit-home: ${getYakitHome()}`)
console.log(`---------- Global-Path End ----------`)

module.exports = {
  getAppConfigDir,
  getConfigPath,
  getConfig,
  setConfig,

  getYakitHome,

  getYaklangEngineDir,
  getYakitInstallDir,
  getLocalYaklangEngine,
  loadExtraFilePath,

  getBasicDir,
  getLocalCachePath,
  getExtraLocalCachePath,

  getEngineLogDir,
  getRenderLogDir,
  getPrintLogDir,

  getRemoteLinkDir,
  getRemoteLinkFile,

  getCodeDir,

  getHtmlTemplateDir,
  getWindowStatePath,
  getYakProjects,

  getYakTemp,

  getYakOnlineRagLatest,

  getAiImageTemp,
}

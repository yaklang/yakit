const { app } = require('electron')
const electronIsDev = require('electron-is-dev')
const os = require('os')
const path = require('path')
const process = require('process')
const fs = require('fs')

const DEFAULT_PROJECT_NAME = 'yakit-projects'

const DEFAULT_CONFIG = {
  YAKIT_HOME: '',
  workspaceHistory: [],
  autoStart: false,
  softLange: 'zh',
  yakitMode: 'classic',
}

// config.json 内存缓存，避免每次调用都重复同步读盘
let configCache = null
// YAKIT_HOME 完整配置缓存（包含 config / currentHome / configDir），初始化后同步读取
let yakitHomeConfigCache = null

// --- 版本环境变量映射 ---
const getVersionEnvVarName = () => {
  const appName = app.getName()
  // 根据应用名称映射到对应的环境变量
  const envVarMap = {
    yakit: 'YAKIT_HOME',
    enpritraceagent: 'ENPRITRACEAGENT_HOME',
    enpritrace: 'ENPRITRACE_HOME',
    irify: 'IRIFY_HOME',
    irifyee: 'IRIFYENPRITRACE_HOME',
    memfit: 'MEMFITAI_HOME',
  }
  const envVar = envVarMap[appName] || 'YAKIT_HOME'
  return envVar
}

/**
 * 获取应用配置目录（只存放 config.json）
 * 使用 ~/.yakit/<app>/，与安装目录解耦，避免重装安装包后工作路径丢失
 * （旧逻辑：Windows 打包=exe 同级，其他=userData）
 */
const getAppConfigDir = () => {
  try {
    const appKey = String(app.getName() || 'yakit')
      .toLowerCase()
      .replace(/\s+/g, '-')
    return path.join(os.homedir(), '.yakit', appKey)
  } catch (e) {
    return path.join(os.homedir(), '.yakit')
  }
}

const getConfigPath = () => {
  return path.join(getAppConfigDir(), 'config.json')
}

/**
 * 同步读取 config.json，启用内存缓存，避免每次调用都重复读盘
 * 命中缓存时直接返回拷贝
 */
const getConfig = () => {
  return configCache ? { ...configCache } : DEFAULT_CONFIG
}

const _ensureDir = (dir) => {
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
  } catch (e) {}
}
const _ensureDirAsync = async (dir) => {
  try {
    await fs.promises.mkdir(dir, { recursive: true })
  } catch (e) {}
}
const _existsAsync = async (p) => {
  try {
    await fs.promises.access(p)
    return true
  } catch (_) {
    return false
  }
}
/**
 * 异步获取应用配置（config.json）
 *
 * 核心职责：
 *   1. 确保配置目录存在
 *   2. 从旧版本路径（userData / Windows exe同级）迁移已有配置
 *   3. 若迁移失败或全新安装，则使用默认配置初始化
 *   4. 读取现有配置并与默认值合并，保证字段完整性
 *   5. 异常兜底：任何错误都会回退到默认配置，保证应用不崩溃
 *
 * @returns {Promise<Object>} 返回配置对象的浅拷贝
 */
const getConfigAsync = async () => {
  // 获取配置文件的绝对路径（由外部 getConfigPath 函数提供）
  const configPath = getConfigPath()

  try {
    // ----- 阶段一：确保父级目录存在 -----
    // 调用辅助函数，递归创建目录（若已存在则静默忽略错误）
    await _ensureDirAsync(path.dirname(configPath))

    // ----- 阶段二：检测配置文件是否存在，不存在则触发迁移 -----
    if (!(await _existsAsync(configPath))) {
      // 收集可能遗留旧配置文件的路径（按优先级排序）
      const legacy = []

      // 候选路径1：Electron 提供的 userData 目录
      try {
        legacy.push(path.join(app.getPath('userData'), 'config.json'))
      } catch (_) {}

      // 候选路径2：Windows 平台且打包后的 exe 同级目录
      try {
        if (process.platform === 'win32' && app.isPackaged) {
          legacy.push(path.join(path.dirname(app.getPath('exe')), 'config.json'))
        }
      } catch (_) {}

      // 遍历所有候选旧路径，尝试复制第一个存在的文件到新位置
      for (const p of legacy) {
        try {
          if (await _existsAsync(p)) {
            // 找到旧配置，复制到目标配置路径
            await fs.promises.copyFile(p, configPath)
            break
          }
        } catch (_) {}
      }
    }

    // ----- 阶段三：迁移完成后再次检查，决定是否需要新建默认配置 -----
    // 场景1：迁移成功 -> 文件已存在，跳过此块，进入读取逻辑
    // 场景2：迁移失败（无旧文件/复制失败）-> 文件依然不存在，执行新建
    if (!(await _existsAsync(configPath))) {
      await fs.promises.writeFile(configPath, JSON.stringify(DEFAULT_CONFIG, null, 2), 'utf8')
      configCache = { ...DEFAULT_CONFIG }
      return { ...configCache }
    }

    // ----- 阶段四：读取并解析现有配置文件 -----
    const raw = await fs.promises.readFile(configPath, 'utf8')
    const parsed = JSON.parse(raw)
    configCache = { ...DEFAULT_CONFIG, ...parsed }
    return { ...configCache }
  } catch (e) {
    // ----- 全局异常捕获（兜底策略）-----
    // 捕获范围：目录创建、文件读写、JSON解析、迁移过程中的任何意外错误
    console.log(`read config.json failed, using defaults: ${e}`)
    // 尽力尝试将默认配置写入磁盘（写入失败则静默忽略，避免二次异常）
    try {
      await fs.promises.writeFile(configPath, JSON.stringify(DEFAULT_CONFIG, null, 2), 'utf8')
    } catch (_) {}
    configCache = { ...DEFAULT_CONFIG }
    return { ...configCache }
  }
}

/**
 * 写入配置项，成功时同步更新内存缓存
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
    configCache = current
    if (yakitHomeConfigCache) {
      yakitHomeConfigCache = { ...current, currentHome: current['YAKIT_HOME'], configDir: getAppConfigDir() }
    }
    return true
  } catch (e) {
    console.log(`write config.json failed: ${e}`)
    // 写盘失败时清空缓存，下次读取重新加载文件
    configCache = null
    yakitHomeConfigCache = null
    return false
  }
}

// --- 核心路径 getter ---

/**
 * 计算 YAKIT_HOME 路径（纯逻辑，不创建目录）
 * 优先级: config.json > 环境变量 YAKIT_HOME > 默认值
 */
const _resolveYakitHomePath = () => {
  const config = getConfig()
  let homePath = config.YAKIT_HOME

  const envVarName = getVersionEnvVarName()
  if (!homePath && process.env[envVarName]) {
    homePath = process.env[envVarName]
  }

  let currentHome
  if (!homePath) {
    const winPackaged = process.platform === 'win32' && app.isPackaged
    try {
      if (winPackaged) {
        const appDir = path.dirname(app.getPath('exe'))
        currentHome = path.join(appDir, DEFAULT_PROJECT_NAME)
      }
    } catch (_) {}
    if (!currentHome) {
      currentHome = path.join(os.homedir(), DEFAULT_PROJECT_NAME)
    }
  } else if (path.isAbsolute(homePath)) {
    currentHome = homePath
  } else {
    currentHome = path.join(os.homedir(), homePath)
  }

  return currentHome
}

/**
 * 同步获取 YAKIT_HOME
 */
const getYakitHome = () => {
  try {
    const currentHome = _resolveYakitHomePath()
    _ensureDir(currentHome)
    return currentHome
  } catch (e) {
    console.log(`getYakitHome failed, using fallback: ${e}`)
    const fallback = path.join(os.homedir(), DEFAULT_PROJECT_NAME)
    _ensureDir(fallback)
    return fallback
  }
}
/**
 * 异步获取 YAKIT_HOME、与 getYakitHome() 逻辑一致，但目录创建为异步
 */
const getYakitHomeAsync = async () => {
  try {
    const currentHome = _resolveYakitHomePath()
    await _ensureDirAsync(currentHome)
    return currentHome
  } catch (e) {
    console.log(`getYakitHomeAsync failed, using fallback: ${e}`)
    const fallback = path.join(os.homedir(), DEFAULT_PROJECT_NAME)
    await _ensureDirAsync(fallback)
    return fallback
  }
}

/**
 * 异步预初始化：读取配置并确保 YAKIT_HOME 目录存在
 * 只在 app 启动早期调用一次，后续同步 getter 直接复用缓存
 */
const initConfigAndHomeAsync = async () => {
  try {
    const config = await getConfigAsync()
    const currentHome = await getYakitHomeAsync()
    yakitHomeConfigCache = { ...config, currentHome, configDir: getAppConfigDir() }
  } catch (error) {}
}

/**
 * 同步获取 YAKIT_HOME 完整配置（从缓存读取）
 */
const getYakitHomeConfig = () => {
  return yakitHomeConfigCache
    ? { ...yakitHomeConfigCache }
    : { ...getConfig(), currentHome: getYakitHome(), configDir: getAppConfigDir() }
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
  initConfigAndHomeAsync,
  getYakitHomeConfig,

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

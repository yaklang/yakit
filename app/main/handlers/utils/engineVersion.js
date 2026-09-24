const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const { getYaklangEngineDir, loadExtraFilePath } = require('../../filePath')
const {
  SLIM_ENGINE_VERSION_PREFIX,
  isSlimEngineVersion,
  getOssEngineVersion,
  resolveEngineArtifactVersion: resolveEngineArtifactVersionWithLegacy,
  getLocalEngineCacheName: getLocalEngineCacheNameWithLegacy,
} = require('./engineArtifact')

const ENGINE_BUILD_TYPE_FILE = 'engine-build-type.txt'

const isLegacySystemMode = () => {
  try {
    return (
      `${fs.readFileSync(loadExtraFilePath(path.join('bins', 'yakit-system-mode.txt')), 'utf8')}`.trim() === 'legacy'
    )
  } catch (e) {
    return false
  }
}

/** 版本号原样保留。产物缺失时的全量回退在下载侧处理，不在这里按 legacy 改版本。 */
const resolveEngineArtifactVersion = (version) => resolveEngineArtifactVersionWithLegacy(version, isLegacySystemMode())

/** 本地缓存引擎文件名：yak-{version} / yak-dev-xxx / yak-slim-{version} */
const getLocalEngineCacheName = (version) => getLocalEngineCacheNameWithLegacy(version, isLegacySystemMode())

const getEngineBuildTypeFilePath = () => path.join(getYaklangEngineDir(), ENGINE_BUILD_TYPE_FILE)

const getLatestYakLocalEnginePath = () => {
  switch (process.platform) {
    case 'darwin':
    case 'linux':
      return path.join(getYaklangEngineDir(), 'yak')
    case 'win32':
      return path.join(getYaklangEngineDir(), 'yak.exe')
    default:
      return path.join(getYaklangEngineDir(), 'yak')
  }
}

const fileSha256 = (filePath) => {
  const sum = crypto.createHash('sha256')
  sum.update(fs.readFileSync(filePath))
  return sum.digest('hex')
}

/** 持久化当前引擎构建类型：full | slim */
const writeEngineBuildType = (buildType) => {
  const type = buildType === 'slim' ? 'slim' : 'full'
  const dir = getYaklangEngineDir()
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  fs.writeFileSync(getEngineBuildTypeFilePath(), type, 'utf8')
}

/** 根据下载/安装版本号写入构建类型 */
const writeEngineBuildTypeByVersion = (version) => {
  writeEngineBuildType(isSlimEngineVersion(resolveEngineArtifactVersion(version)) ? 'slim' : 'full')
}

/**
 * 读取当前引擎构建类型。
 * 优先读本地标记文件；若无标记，则用已缓存的 slim 包与当前引擎 hash 比对作回退。
 */
const fetchEngineBuildType = (version) => {
  try {
    const p = getEngineBuildTypeFilePath()
    if (fs.existsSync(p)) {
      const t = `${fs.readFileSync(p, 'utf8')}`.trim()
      if (t === 'slim' || t === 'full') return t
    }
  } catch (e) {}

  try {
    const ver = getOssEngineVersion(version || '').replace(/^v/, '')
    if (ver) {
      const local = getLatestYakLocalEnginePath()
      const slimCache = path.join(getYaklangEngineDir(), getLocalEngineCacheName(`slim/${ver}`))
      if (fs.existsSync(local) && fs.existsSync(slimCache) && fileSha256(local) === fileSha256(slimCache)) {
        try {
          writeEngineBuildType('slim')
        } catch (e) {}
        return 'slim'
      }
    }
  } catch (e) {}

  return 'full'
}

const readBundledEngineBuildType = () => {
  try {
    const p = loadExtraFilePath(path.join('bins', 'engine-build-type.txt'))
    if (!fs.existsSync(p)) return 'full'
    return `${fs.readFileSync(p, 'utf8')}`.trim() === 'slim' ? 'slim' : 'full'
  } catch (e) {
    return 'full'
  }
}

/**
 * 标记文件优先。fetchHash 只查 slim 产物本身，404 不能改拿全量 hash。
 * 否则没有轻量包时（目前是 Windows legacy）全量二进制会被标成 slim。
 * fetchHash 由调用方传入，避免和 network 循环依赖。
 */
const resolveEngineBuildType = async (version, fetchHash) => {
  const localType = fetchEngineBuildType(version)
  if (localType === 'slim') return 'slim'

  const ver = getOssEngineVersion(version || '').replace(/^v/, '')
  if (!ver || ver === 'dev' || ver.startsWith('dev/')) return localType

  try {
    const enginePath = getLatestYakLocalEnginePath()
    if (!fs.existsSync(enginePath) || typeof fetchHash !== 'function') return localType
    const onlineSlimHash = await fetchHash(`slim/${ver}`, { timeout: 3000 })
    if (onlineSlimHash && fileSha256(enginePath) === onlineSlimHash) {
      try {
        writeEngineBuildType('slim')
      } catch (e) {}
      return 'slim'
    }
  } catch (e) {}

  return localType
}

module.exports = {
  SLIM_ENGINE_VERSION_PREFIX,
  isSlimEngineVersion,
  getOssEngineVersion,
  isLegacySystemMode,
  resolveEngineArtifactVersion,
  getLocalEngineCacheName,
  writeEngineBuildType,
  writeEngineBuildTypeByVersion,
  fetchEngineBuildType,
  readBundledEngineBuildType,
  resolveEngineBuildType,
  getLatestYakLocalEnginePath,
  fileSha256,
}

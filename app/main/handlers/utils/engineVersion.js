const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const { getYaklangEngineDir, loadExtraFilePath } = require('../../filePath')
const {
  SLIM_ENGINE_VERSION_PREFIX,
  isSlimEngineVersion,
  getOssEngineVersion,
  resolveEngineArtifactVersion: resolveEngineArtifactVersionWithLegacy,
  getYakEngineNamePrefix,
  getLocalEngineCacheName: getLocalEngineCacheNameWithLegacy,
  getYakEngineArtifactFileName,
  getYakEngineArtifactOssPath,
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

/** legacy 包没有 slim 产物，下载/校验时回退到标准版本号 */
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

module.exports = {
  SLIM_ENGINE_VERSION_PREFIX,
  isSlimEngineVersion,
  getOssEngineVersion,
  isLegacySystemMode,
  resolveEngineArtifactVersion,
  getLocalEngineCacheName,
  getYakEngineNamePrefix,
  getYakEngineArtifactFileName,
  getYakEngineArtifactOssPath,
  writeEngineBuildType,
  writeEngineBuildTypeByVersion,
  fetchEngineBuildType,
  getLatestYakLocalEnginePath,
  fileSha256,
}

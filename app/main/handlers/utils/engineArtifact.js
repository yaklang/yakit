/** 引擎 OSS 产物命名，纯函数，不依赖 Electron */

const SLIM_ENGINE_VERSION_PREFIX = 'slim/'

const isSlimEngineVersion = (version) => (version || '').startsWith(SLIM_ENGINE_VERSION_PREFIX)

const getOssEngineVersion = (version) => (version || '').replace(new RegExp(`^${SLIM_ENGINE_VERSION_PREFIX}`), '')

/**
 * 版本号原样保留。legacy 只影响 Windows 文件名里的 legacy_ 段，
 * 不在这里把 slim/ 改成全量；产物不存在时由下载侧再退回全量。
 */
const resolveEngineArtifactVersion = (version) => version || ''

/** slim/x 对应的全量版本号。本身不是轻量版本时返回空串。 */
const getFullEngineArtifactVersion = (version) => (isSlimEngineVersion(version) ? getOssEngineVersion(version) : '')

/**
 * 根据版本号获取引擎文件名前缀，与 exp-cross-build 一致：
 * slim -> yak-slim_, yakit -> yaklang_yakit_, irify -> yaklang_irify_, 其它 -> yak_
 */
const getYakEngineNamePrefix = (version) => {
  if (isSlimEngineVersion(version)) return 'yak-slim_'
  const v = getOssEngineVersion(version || '').toLowerCase()
  if (v.includes('yakit')) return 'yaklang_yakit_'
  if (v.includes('irify')) return 'yaklang_irify_'
  return 'yak_'
}

/** 本地缓存引擎文件名：yak-{version} / yak-dev-xxx / yak-slim-{version} */
const getLocalEngineCacheName = (version) => {
  const ver = resolveEngineArtifactVersion(version)
  if ((ver || '').startsWith('dev/')) {
    return 'yak-' + ver.replace('dev/', 'dev-')
  }
  if (isSlimEngineVersion(ver)) {
    return 'yak-slim-' + getOssEngineVersion(ver)
  }
  return `yak-${ver}`
}

const getYakEngineArtifactFileName = (version, { platform, arch, isLegacy } = {}) => {
  const artifactVersion = resolveEngineArtifactVersion(version)
  const prefix = getYakEngineNamePrefix(artifactVersion)
  const plat = platform || 'win32'
  const architecture = arch || 'x64'
  switch (plat) {
    case 'darwin':
      return `${prefix}darwin_${architecture === 'arm64' ? 'arm64' : 'amd64'}`
    case 'win32':
    case 'windows':
      return `${prefix}windows_${isLegacy ? 'legacy_' : ''}amd64.exe`
    case 'linux':
      return `${prefix}linux_${architecture === 'arm64' ? 'arm64' : 'amd64'}`
    default:
      throw new Error(`Unsupported platform: ${plat}`)
  }
}

const getYakEngineArtifactOssPath = (version, options) => {
  const artifactVersion = resolveEngineArtifactVersion(version)
  const ossVersion = getOssEngineVersion(artifactVersion)
  return `${ossVersion}/${getYakEngineArtifactFileName(version, options)}`
}

module.exports = {
  SLIM_ENGINE_VERSION_PREFIX,
  isSlimEngineVersion,
  getOssEngineVersion,
  resolveEngineArtifactVersion,
  getFullEngineArtifactVersion,
  getYakEngineNamePrefix,
  getLocalEngineCacheName,
  getYakEngineArtifactFileName,
  getYakEngineArtifactOssPath,
}

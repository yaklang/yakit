import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { getYaklangEngineDir } from '../filePath'

/** 轻量引擎版本标记，与 dev/ 类似：slim/1.4.8-beta6 */
const SLIM_ENGINE_VERSION_PREFIX = 'slim/'

const ENGINE_BUILD_TYPE_FILE = 'engine-build-type.txt'

/** 是否为轻量引擎版本（前端仅在 Yakit 侧可选） */
const isSlimEngineVersion = (version: string) => (version || '').startsWith(SLIM_ENGINE_VERSION_PREFIX)

/** OSS 路径使用的版本号（去掉 slim/ 前缀） */
const getOssEngineVersion = (version: string) =>
  (version || '').replace(new RegExp(`^${SLIM_ENGINE_VERSION_PREFIX}`), '')

/** 本地缓存引擎文件名：yak-{version} / yak-dev-xxx / yak-slim-{version} */
const getLocalEngineCacheName = (version: string) => {
  if ((version || '').startsWith('dev/')) {
    return 'yak-' + version.replace('dev/', 'dev-')
  }
  if (isSlimEngineVersion(version)) {
    return 'yak-slim-' + getOssEngineVersion(version)
  }
  return `yak-${version}`
}

/**
 * 根据版本号获取引擎文件名前缀，与 exp-cross-build 一致：
 * slim -> yak-slim_, yakit -> yaklang_yakit_, irify -> yaklang_irify_, 其它 -> yak_
 */
const getYakEngineNamePrefix = (version: string) => {
  if (isSlimEngineVersion(version)) return 'yak-slim_'
  const v = getOssEngineVersion(version || '').toLowerCase()
  if (v.includes('yakit')) return 'yaklang_yakit_'
  if (v.includes('irify')) return 'yaklang_irify_'
  return 'yak_'
}

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

const fileSha256 = async (filePath: string, signal?: AbortSignal) => {
  const sum = crypto.createHash('sha256')
  for await (const chunk of fs.createReadStream(filePath, { highWaterMark: 1024 * 1024, signal })) sum.update(chunk)
  return sum.digest('hex')
}

/** 持久化当前引擎构建类型：full | slim */
const writeEngineBuildType = (buildType: 'full' | 'slim') => {
  const type = buildType === 'slim' ? 'slim' : 'full'
  const dir = getYaklangEngineDir()
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  fs.writeFileSync(getEngineBuildTypeFilePath(), type, 'utf8')
}

/** 根据下载/安装版本号写入构建类型 */
const writeEngineBuildTypeByVersion = (version: string) => {
  writeEngineBuildType(isSlimEngineVersion(version) ? 'slim' : 'full')
}

/**
 * 读取当前引擎构建类型。
 * 优先读本地标记文件；若无标记，则用已缓存的 slim 包与当前引擎 hash 比对作回退。
 */
const fetchEngineBuildType = async (version: string) => {
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
      if (
        fs.existsSync(local) &&
        fs.existsSync(slimCache) &&
        (await fileSha256(local)) === (await fileSha256(slimCache))
      ) {
        try {
          writeEngineBuildType('slim')
        } catch (e) {}
        return 'slim'
      }
    }
  } catch (e) {}

  return 'full'
}

export {
  SLIM_ENGINE_VERSION_PREFIX,
  isSlimEngineVersion,
  getOssEngineVersion,
  getLocalEngineCacheName,
  getYakEngineNamePrefix,
  writeEngineBuildType,
  writeEngineBuildTypeByVersion,
  fetchEngineBuildType,
  getLatestYakLocalEnginePath,
  fileSha256,
}

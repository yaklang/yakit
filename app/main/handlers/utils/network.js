// const https = require("https");
// const {caBundle} = require("../missedCABundle");
const axios = require('axios')
const url = require('url')
const process = require('process')
const { requestWithProgress } = require('./requestWithProgress')
const events = require('events')
const fs = require('fs')
const path = require('path')
const { loadExtraFilePath } = require('../../filePath')
const { HttpsProxyAgent } = require('hpagent')
const electronIsDev = require('electron-is-dev')
const { HttpSetting } = require('../../state')
const {
  getOssEngineVersion,
  getLocalEngineCacheName,
  isLegacySystemMode,
  SLIM_ENGINE_VERSION_PREFIX,
  isSlimEngineVersion,
} = require('./engineVersion')
const {
  getYakEngineArtifactFileName,
  getFullEngineArtifactVersion,
  isSlimEngineVersion: isSlimArtifactVersion,
} = require('./engineArtifact')

const add_proxy = process.env.https_proxy || process.env.HTTPS_PROXY

const agent = !!add_proxy
  ? new HttpsProxyAgent({
      proxy: add_proxy,
      rejectUnauthorized: false, // 忽略 HTTPS 错误
    })
  : undefined

const ossDomains = [
  'oss-qn.yaklang.com',
  'aliyun-oss.yaklang.com',
  'yaklang.oss-cn-beijing.aliyuncs.com',
  'yaklang.oss-accelerate.aliyuncs.com',
]

const getHttpsAgentByDomain = (domain) => {
  // if (domain.endsWith('.yaklang.com')) {
  //     console.info(`use ssl ca-bundle for ${domain}`);
  //     return new https.Agent({ca: caBundle, rejectUnauthorized: true}) // unsafe...
  // }
  return undefined
}

const config = {
  initializedOSSDomain: false,
  currentOSSDomain: '',
  fetchingOSSDomain: false,
  fetchOSSDomainEventEmitter: new events.EventEmitter(),
  loggedCachedDomain: false,
}

/** 初始化 oss 配置信息 */
async function getAvailableOSSDomain() {
  try {
    if (config.initializedOSSDomain) {
      if (!config.currentOSSDomain) {
        config.loggedCachedDomain = false
        return 'yaklang.oss-accelerate.aliyuncs.com'
      } else {
        if (!config.loggedCachedDomain) {
          console.info(`(cached) use oss domain: ${config.currentOSSDomain}`)
          config.loggedCachedDomain = true
        }
        return config.currentOSSDomain
      }
    }

    if (config.fetchingOSSDomain) {
      return new Promise((resolve, reject) => {
        config.fetchOSSDomainEventEmitter.once('done', () => {
          console.info('fetch oss domain done, resolve the promise.')
          if (!config.currentOSSDomain) {
            config.loggedCachedDomain = false
            resolve('yaklang.oss-accelerate.aliyuncs.com')
          } else {
            if (!config.loggedCachedDomain) {
              console.info(`(cached) use oss domain: ${config.currentOSSDomain}`)
              config.loggedCachedDomain = true
            }
            resolve(config.currentOSSDomain)
          }
        })
      })
    }

    config.fetchingOSSDomain = true

    try {
      for (const domain of ossDomains) {
        const url = `https://${domain}/yak/latest/version.txt`
        try {
          console.info(`start to do axios.get to ${url}`)
          const response = await axios.get(url, {
            httpsAgent: getHttpsAgentByDomain(domain),
            ...(agent ? { httpsAgent: agent, proxy: false } : {}),
          })
          if (response.status !== 200) {
            console.error(`Failed to access (StatusCode) ${url}: ${response.status}`)
            continue
          }
          config.currentOSSDomain = domain
          config.initializedOSSDomain = true
          break
        } catch (e) {
          console.error(`Failed to access ${url}: ${e.message}`)
        }
      }
      if (!config.currentOSSDomain) {
        return 'yaklang.oss-accelerate.aliyuncs.com'
      }
      return config.currentOSSDomain
    } catch (e) {
      return 'yaklang.oss-accelerate.aliyuncs.com'
    } finally {
      config.fetchingOSSDomain = false
      config.fetchOSSDomainEventEmitter.emit('done')
    }
  } catch (e) {
    return 'yaklang.oss-accelerate.aliyuncs.com'
  }
}

/** 开发环境下载不加 Windows 文件名里的 legacy_。校验地址仍看安装包是不是 legacy。这里不把 slim/ 改成全量。 */
const isLegacyEnginePack = (skipInDev) => {
  if (skipInDev && electronIsDev) return false
  return isLegacySystemMode()
}

const getEngineArtifactUrl = async (version, { skipLegacyInDev = false, checksum = false } = {}) => {
  const domain = await getAvailableOSSDomain()
  const isLegacy = isLegacyEnginePack(skipLegacyInDev)
  const fileName = getYakEngineArtifactFileName(version, {
    platform: process.platform,
    arch: process.arch,
    isLegacy,
  })
  const ossVersion = getOssEngineVersion(version)
  return `https://${domain}/yak/${ossVersion}/${fileName}${checksum ? '.sha256.txt' : ''}`
}

/** 获取校验url */
const getCheckTextUrl = async (version) => getEngineArtifactUrl(version, { checksum: true })

const readHashBody = (data) => {
  const onlineHash = Buffer.from(data).toString('utf8').replace(/\r?\n/g, '').trim()
  if (!onlineHash) throw new Error('校验值不存在')
  return onlineHash
}

/** 只查这一个版本。404 返回空串，其它错误抛出。 */
const fetchExactYakVersionHash = async (version, requestConfig) => {
  const url = await getCheckTextUrl(version)
  if (url === '') throw new Error(`No Find ${version} Hash Url`)
  try {
    const response = await axios.get(url, { ...(requestConfig || {}), httpsAgent: getHttpsAgentByDomain(url) })
    return readHashBody(response.data)
  } catch (err) {
    if (err.response && err.response.status === 404) return ''
    throw err
  }
}

/**
 * 仅社区版 Yakit 会请求 slim/ 版本。macOS / Linux / Windows（含 legacy）都先查轻量产物，
 * 校验文件不存在再退回同版本全量产物。目前只有 Windows legacy 没有轻量包。
 * 企业版 / IRify / Memfit 不带 slim/ 前缀，不会进这条回退。
 */
const resolveEngineDownloadVersion = async (version, requestConfig) => {
  if (!isSlimArtifactVersion(version)) return version
  const slimHash = await fetchExactYakVersionHash(version, requestConfig)
  if (slimHash) return version
  return getFullEngineArtifactVersion(version) || version
}

/** 获取指定版本号的引擎 Hash。轻量产物缺失时返回全量产物的 Hash。 */
const fetchSpecifiedYakVersionHash = async (version, requestConfig) => {
  const resolved = await resolveEngineDownloadVersion(version, requestConfig)
  return fetchExactYakVersionHash(resolved, requestConfig)
}
/** 获取最新 yak 版本号 */
const fetchLatestYakEngineVersion = () => fetchLatestVersionCommon('yak/latest/version.txt')
/** 获取最新 yakit 版本号 */
const fetchLatestYakitVersion = (requestConfig) =>
  fetchLatestVersionCommon('yak/latest/yakit-version.txt', requestConfig)
/** 获取最新 yakit EE 版本号 */
const fetchLatestYakitEEVersion = (requestConfig) =>
  fetchLatestVersionCommon('vip/latest/yakit-version.txt', requestConfig)
/** 获取最新 IRify Scan 版本号 */
const fetchLatestYakitIRifyVersion = (requestConfig) =>
  fetchLatestVersionCommon('irify/latest/yakit-version.txt', requestConfig)
/** 获取最新 IRify Scan EE版本号 */
const fetchLatestYakitIRifyEEVersion = (requestConfig) =>
  fetchLatestVersionCommon('svip/latest/yakit-version.txt', requestConfig)

/** 获取最新 IRify Scan 版本号 */
const fetchLatestYakitMemfitVersion = (requestConfig) =>
  fetchLatestVersionCommon('memfit/latest/yakit-version.txt', requestConfig)
/** 获取最新版本号 */
const fetchLatestVersionCommon = async (path, requestConfig = {}) => {
  const domain = await getAvailableOSSDomain()
  const versionUrl = `https://${domain}/${path}`
  const config = {
    ...requestConfig,
    httpsAgent: getHttpsAgentByDomain(domain),
    ...(agent ? { httpsAgent: agent, proxy: false } : {}),
  }
  const response = await axios.get(versionUrl, config)
  const versionData = `${response.data}`.trim()
  if (!versionData) {
    throw new Error('Failed to fetch version data')
  }
  return versionData.startsWith('v') ? versionData : `v${versionData}`
}
/** 下载地址。开发环境省略 Windows 的 legacy_ 段，slim/ 仍请求轻量产物。校验 404 时退回全量在 resolveEngineDownloadVersion，legacy 也走那里。 */
const getYakEngineDownloadUrl = async (version) => getEngineArtifactUrl(version, { skipLegacyInDev: true })

const getSuffix = () => {
  let system_mode = ''
  // 开发环境是不添加-legacy
  if (electronIsDev) return ''
  try {
    system_mode = fs.readFileSync(loadExtraFilePath(path.join('bins', 'yakit-system-mode.txt'))).toString('utf8')
  } catch (error) {
    console.log('error', error)
  }
  const suffix = system_mode === 'legacy' ? '-legacy' : ''
  return suffix
}

// 目前存在4个版本 IRifyCE 、 IRifyEE 、 YakitCE 、 YakitEE
// PS: name为软件名 dir为OSS路径
const DownloadUrlByType = {
  YakitCE: {
    name: 'Yakit',
    dir: 'yak',
    suffix: getSuffix(),
  },
  YakitEE: {
    name: 'EnpriTrace',
    dir: 'vip',
    suffix: getSuffix(),
  },
  IRifyCE: {
    name: 'IRify',
    dir: 'irify',
    suffix: getSuffix(),
  },
  IRifyEE: {
    name: 'IRifyEnpriTrace',
    dir: 'svip',
    suffix: getSuffix(),
  },
  Memfit: {
    name: 'MemfitAI',
    dir: 'memfit',
    suffix: getSuffix(),
  },
}

/** 获取 Yakit 下载地址 */
const getDownloadUrl = async (version, type) => {
  const domain = await getAvailableOSSDomain()
  // 如若识别不到默认识别为Yakit社区版
  const { name, dir, suffix } = DownloadUrlByType[type] || DownloadUrlByType['YakitCE']
  switch (process.platform) {
    case 'darwin':
      if (process.arch === 'arm64') {
        return `https://${domain}/${dir}/${version}/${name}-${version}-darwin${suffix}-arm64.dmg`
      } else {
        return `https://${domain}/${dir}/${version}/${name}-${version}-darwin${suffix}-x64.dmg`
      }
    case 'win32':
      return `https://${domain}/${dir}/${version}/${name}-${version}-windows${suffix}-amd64.exe`
    case 'linux':
      if (process.arch === 'arm64') {
        return `https://${domain}/${dir}/${version}/${name}-${version}-linux${suffix}-arm64.AppImage`
      } else {
        return `https://${domain}/${dir}/${version}/${name}-${version}-linux${suffix}-amd64.AppImage`
      }
  }
  throw new Error(`Unsupported platform: ${process.platform}`)
}

/** 下载引擎进度 */
const downloadYakEngine = async (version, destination, progressHandler, onFinished, onError) => {
  const downloadUrl = await getYakEngineDownloadUrl(version)
  requestWithProgress(
    downloadUrl,
    destination,
    {
      httpsAgent: getHttpsAgentByDomain(url.parse(downloadUrl).host),
    },
    progressHandler,
    onFinished,
    onError,
  )
}
/** 下载 Yakit CE 进度 */
const downloadYakitCommunity = async (
  version,
  isIRify,
  isMemfit,
  destination,
  progressHandler,
  onFinished,
  onError,
) => {
  let versionType = 'YakitCE'
  if (isIRify) {
    versionType = 'IRifyCE'
  } else if (isMemfit) {
    versionType = 'Memfit'
  }
  const downloadUrl = await getDownloadUrl(version, versionType)
  console.info(`start to download yakit community: ${downloadUrl}`)
  requestWithProgress(
    downloadUrl,
    destination,
    {
      httpsAgent: getHttpsAgentByDomain(url.parse(downloadUrl).host),
    },
    progressHandler,
    onFinished,
    onError,
  )
}
/** 下载 Yakit EE 进度 */
const downloadYakitEE = async (version, isIRify, destination, progressHandler, onFinished, onError) => {
  const downloadUrl = await getDownloadUrl(version, isIRify ? 'IRifyEE' : 'YakitEE')
  requestWithProgress(
    downloadUrl,
    destination,
    {
      httpsAgent: getHttpsAgentByDomain(url.parse(downloadUrl).host),
    },
    progressHandler,
    onFinished,
    onError,
  )
}

/** 下载 Yakit 内网版 进度 */
const downloadIntranetYakit = async (filePath, destination, progressHandler, onFinished, onError) => {
  requestWithProgress(
    filePath,
    destination,
    {
      httpsAgent: getHttpsAgentByDomain(url.parse(filePath).host),
    },
    progressHandler,
    onFinished,
    onError,
  )
}

module.exports = {
  getCheckTextUrl,
  fetchExactYakVersionHash,
  fetchSpecifiedYakVersionHash,
  resolveEngineDownloadVersion,
  fetchLatestYakEngineVersion,
  fetchLatestYakitVersion,
  fetchLatestYakitEEVersion,
  fetchLatestYakitIRifyVersion,
  fetchLatestYakitIRifyEEVersion,
  fetchLatestYakitMemfitVersion,
  downloadYakitCommunity,
  downloadYakEngine,
  downloadYakitEE,
  downloadIntranetYakit,
  getYakEngineDownloadUrl,
  getEngineArtifactUrl,
  isLegacyEnginePack,
  getAvailableOSSDomain,
  getDownloadUrl,
  getSuffix,
  isSlimEngineVersion,
  getOssEngineVersion,
  getLocalEngineCacheName,
  SLIM_ENGINE_VERSION_PREFIX,
}

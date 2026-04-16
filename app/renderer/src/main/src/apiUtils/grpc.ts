import { yakitNotify } from '@/utils/notification'
import { APIFunc, APINoRequestFunc, APIOptionalFunc } from './type'
import { fetchEnv, getReleaseEditionName } from '@/utils/envfile'
import { NetWorkApi } from '@/services/fetch'
import { API } from '@/services/swagger/resposeType'
import { yakitEngine } from '@/services/electronBridge'
import i18n from '@/i18n/i18n'
const tOriginal = i18n.getFixedT(null, 'apiUtils')

interface GrpcToHTTPRequestProps {
  timeout?: number
}

export interface ProxyEndpoint {
  Id: string
  Name: string
  Url: string
  UserName: string
  Password: string
  Disabled?: boolean
}

export interface ProxyRoute {
  Id: string
  Name: string
  Patterns: string[]
  EndpointIds: string[]
  Disabled?: boolean
}

export interface GlobalProxyRulesConfig {
  Endpoints: ProxyEndpoint[]
  Routes: ProxyRoute[]
}

/** @name 获取Yakit最新版本号 */
export const grpcFetchLatestYakitVersion: APIOptionalFunc<GrpcToHTTPRequestProps, string> = (config, hiddenError) => {
  return new Promise(async (resolve, reject) => {
    yakitEngine
      .fetchLatestYakitVersion({
        config: config,
        releaseEditionName: getReleaseEditionName(),
      })
      .then(resolve)
      .catch((e) => {
        if (!hiddenError) yakitNotify('error', tOriginal('grpc.fetchLatestYakitVersionFailed', { error: String(e) }))
        reject(e)
      })
  })
}

/** @name 获取Yakit内网最新版本号 */
export const grpcFetchIntranetYakitVersion: APIOptionalFunc<boolean, string> = (hiddenError = false) => {
  return new Promise(async (resolve, reject) => {
    yakitEngine.fetchEnterpriseUpdateInfo().then(({ version }) => {
      NetWorkApi<unknown, API.UploadDataResponse>({
        method: 'get',
        url: 'upload/yak/data',
        params: {
          page: 1,
          limit: 10,
          orderBy: 'updated_at',
          order: 'desc',
          keywords: version,
        },
      })
        .then((res) => {
          let filePath: string = ''
          if ((res?.data || []).length > 0) {
            filePath = res.data[0].filePath
            resolve(filePath)
          } else {
            reject()
          }
        })
        .catch((e) => {
          if (!hiddenError)
            yakitNotify('error', tOriginal('grpc.fetchIntranetYakitVersionFailed', { error: String(e) }))
          reject(e)
        })
        .finally(() => {})
    })
  })
}

let ossDomain: string = ''

/** @name OSS域名 */
export const grpcFetchLatestOSSDomain: APINoRequestFunc<string> = (hiddenError) => {
  return new Promise(async (resolve, reject) => {
    if (ossDomain && ossDomain.length > 0) {
      resolve(ossDomain)
      return
    }
    yakitEngine
      .getAvailableOSSDomain()
      .then((domain) => {
        ossDomain = domain
        resolve(domain)
      })
      .catch(reject)
  })
}

/** @name 获取Yak引擎最新版本号 */
export const grpcFetchLatestYakVersion: APINoRequestFunc<string> = (hiddenError) => {
  return new Promise(async (resolve, reject) => {
    yakitEngine
      .fetchLatestYaklangVersion()
      .then((version: string) => {
        const newVersion = version.startsWith('v') ? version.substring(1) : version
        resolve(newVersion)
      })
      .catch((e) => {
        if (!hiddenError) yakitNotify('error', tOriginal('grpc.fetchLatestYakVersionFailed', { error: String(e) }))
        reject(e)
      })
  })
}

/** @name 获取Yakit本地版本号 */
export const grpcFetchLocalYakitVersion: APINoRequestFunc<string> = (hiddenError) => {
  return new Promise(async (resolve, reject) => {
    yakitEngine
      .fetchYakitVersion()
      .then((version: string) => {
        let newVersion = version
        // 如果存在-ce，则软件是 CE 版本
        if (version.endsWith('-ce')) {
          newVersion = version.replace('-ce', '')
        }
        // 如果存在-ee，则软件是 EE 版本
        if (version.endsWith('-ee')) {
          newVersion = version.replace('-ee', '')
        }
        resolve(newVersion)
      })
      .catch((e) => {
        if (!hiddenError) yakitNotify('error', tOriginal('grpc.fetchLocalYakitVersionFailed', { error: String(e) }))
        reject(e)
      })
  })
}

/** @name 获取Yak引擎本地版本号 */
export const grpcFetchLocalYakVersion: APINoRequestFunc<string> = (hiddenError) => {
  return new Promise(async (resolve, reject) => {
    yakitEngine
      .getCurrentYak()
      .then(resolve)
      .catch((e) => {
        if (!hiddenError) yakitNotify('error', '获取本地引擎版本失败:' + e)
        reject(e)
      })
  })
}

/** @name 获取引擎是否安装的结果 */
export const grpcFetchYakInstallResult: APINoRequestFunc<boolean> = (hiddenError) => {
  return new Promise(async (resolve, reject) => {
    yakitEngine
      .isYaklangEngineInstalled()
      .then(resolve)
      .catch((e) => {
        if (!hiddenError) yakitNotify('error', tOriginal('grpc.fetchYakInstallResultFailed', { error: String(e) }))
        reject(e)
      })
  })
}

/**
 * @name 获取Yak内置引擎版本号
 * 如果没有内置引擎压缩包，也算无法获取到内置引擎版本号
 */
export const grpcFetchBuildInYakVersion: APINoRequestFunc<string> = (hiddenError) => {
  return new Promise(async (resolve, reject) => {
    yakitEngine
      .getBuildInEngineVersion()
      .then(resolve)
      .catch((e) => {
        if (!hiddenError) yakitNotify('error', tOriginal('grpc.fetchBuildInYakVersionFailed', { error: String(e) }))
        reject(e)
      })
  })
}

/** @name 获取指定Yak引擎版本号的校验Hash值 */
export const grpcFetchSpecifiedYakVersionHash: APIFunc<{ version: string; config: GrpcToHTTPRequestProps }, string> = (
  request,
  hiddenError,
) => {
  const { version, config } = request

  return new Promise(async (resolve, reject) => {
    yakitEngine
      .fetchCheckYaklangSource(version, config)
      .then(resolve)
      .catch((e) => {
        if (!hiddenError)
          yakitNotify('error', tOriginal('grpc.fetchSpecifiedYakVersionHashFailed', { error: String(e) }))
        reject(e)
      })
  })
}

/** @name 获取本地Yak引擎的校验Hash值 */
export const grpcFetchLocalYakVersionHash: APINoRequestFunc<string[]> = (hiddenError) => {
  return new Promise(async (resolve, reject) => {
    yakitEngine
      .calcEngineSha265()
      .then(resolve)
      .catch((e) => {
        if (!hiddenError) yakitNotify('error', tOriginal('grpc.fetchLocalYakVersionHashFailed', { error: String(e) }))
        reject(e)
      })
  })
}

/** @name 获取本地启动引擎可用的端口号 */
export const grpcFetchAvaiableProt: APINoRequestFunc<number> = (hiddenError) => {
  return new Promise(async (resolve, reject) => {
    yakitEngine
      .getAvailablePort()
      .then(resolve)
      .catch((e) => {
        try {
          const { message } = e
          const error = message.split("'get-avaiable-port':").pop()
          if (!hiddenError) yakitNotify('error', tOriginal('grpc.fetchAvailablePortFailed', { error: String(error) }))
          reject(error)
        } catch (error) {
          reject(e)
        }
      })
  })
}

/** @name 判断已运行的引擎适配版本 */
export const grpcDetermineAdaptedVersionEngine: APIFunc<number, boolean> = (port, hiddenError) => {
  return new Promise(async (resolve, reject) => {
    yakitEngine
      .determineAdaptedVersionEngine({ port: port, version: fetchEnv() || 'yakit' })
      .then(resolve)
      .catch((e) => {
        if (!hiddenError)
          yakitNotify('error', tOriginal('grpc.determineAdaptedVersionEngineFailed', { error: String(e) }))
        reject(e)
      })
  })
}

/** @name 获取全局代理规则配置 */
export const grpcGetGlobalProxyRulesConfig: APINoRequestFunc<GlobalProxyRulesConfig> = () => {
  return new Promise(async (resolve, reject) => {
    yakitEngine
      .getGlobalProxyRulesConfig()
      .then((res: GlobalProxyRulesConfig) => {
        if (!res) {
          resolve({ Endpoints: [], Routes: [] })
          return
        }
        resolve(res)
      })
      .catch((e) => {
        reject(e)
      })
  })
}

/** @name 设置全局代理规则配置 */
export const grpcSetGlobalProxyRulesConfig: APIFunc<GlobalProxyRulesConfig, null> = (config) => {
  return new Promise(async (resolve, reject) => {
    yakitEngine
      .setGlobalProxyRulesConfig(config)
      .then(() => {
        resolve(null)
      })
      .catch((e) => {
        reject(e)
      })
  })
}

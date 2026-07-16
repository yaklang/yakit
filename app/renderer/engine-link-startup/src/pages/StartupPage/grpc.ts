import { yakitNotify } from '@/utils/notification'
import { APIFunc, APINoRequestFunc, APIOptionalFunc } from '@/utils/api'
import { yakitApp, yakitEngine, yakitShell } from '@/utils/electronBridge'
import {
  AllowSecretLocalExecResult,
  CheckAllowSecretLocal,
  ExecResult,
  FixupDatabase,
  FixupDatabaseExecResult,
  ReclaimDatabaseSpace,
  WriteEngineKeyToYakitProjects,
} from './components/LocalEngine/LocalEngineType'
import { StartLocalEngine } from './types'
import { randomString } from '@/utils/randomUtil'
import { getReleaseEditionName, isEnterpriseEdition, isIRify, isMemfit } from '@/utils/envfile'
import i18n from '@/i18n/i18n'
const tOriginal = i18n.getFixedT(null, ['link'])

/** @name 插件漏洞信息库自检 */
export const grpcInitCVEDatabase: APINoRequestFunc<unknown> = (hiddenError) => {
  return new Promise(async (resolve, reject) => {
    yakitEngine
      .initCVEDatabase()
      .then(resolve)
      .catch((e: any) => {
        if (!hiddenError) yakitNotify('info', tOriginal('Grpc.cve_db_check_error', { error: e }))
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
      .catch((e: any) => {
        if (!hiddenError) yakitNotify('error', tOriginal('Grpc.fetch_yak_install_result_failed', { error: e }))
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
      .catch((e: any) => {
        if (!hiddenError) yakitNotify('error', tOriginal('Grpc.fetch_buildin_yak_version_failed', { error: e }))
        reject(e)
      })
  })
}

/** @name 解压内置引擎 */
export const grpcUnpackBuildInYak: APINoRequestFunc<unknown> = (hiddenError) => {
  return new Promise(async (resolve, reject) => {
    yakitEngine
      .restoreEngineAndPlugin()
      .then(resolve)
      .catch((e: any) => {
        if (!hiddenError) yakitNotify('error', tOriginal('Grpc.unpack_buildin_yak_failed', { error: e }))
        reject(e)
      })
  })
}

/** @name 重启项目 */
export const grpcRelaunch: APINoRequestFunc<unknown> = (hiddenError) => {
  return new Promise(async (resolve, reject) => {
    yakitApp
      .relaunch()
      .then(resolve)
      .catch((e: any) => {
        if (!hiddenError) yakitNotify('error', tOriginal('Grpc.relaunch_failed', { error: e }))
        reject(e)
      })
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
      .catch((e: any) => {
        if (!hiddenError) yakitNotify('error', tOriginal('Grpc.fetch_latest_yak_version_failed', { error: e }))
        reject(e)
      })
  })
}

/** @name 下载指定版本Yak引擎 */
export const grpcFetchDownloadYak: APIFunc<string, boolean> = (version, hiddenError) => {
  return new Promise(async (resolve, reject) => {
    yakitEngine
      .downloadLatestYak(version)
      .then(() => {
        resolve(true)
      })
      .catch((e: any) => {
        if (!hiddenError) yakitNotify('error', tOriginal('Grpc.download_yak_failed', { version, error: e }))
        reject(e)
      })
  })
}

/** @name 考虑在mac下载完成后，在其yakit-projects目录下写入一个文件engine-sha256.txt，注入当前引擎hash值 */
export const grpcWriteEngineKeyToYakitProjects: APIFunc<WriteEngineKeyToYakitProjects, boolean> = (
  params,
  hiddenError,
) => {
  return new Promise(async (resolve, reject) => {
    yakitEngine
      .writeEngineKeyToYakitProjects(params.version)
      .then(() => {
        resolve(true)
      })
      .catch((e: any) => {
        if (!hiddenError)
          yakitNotify('error', tOriginal('Grpc.write_engine_key_failed', { version: params.version, error: e }))
        reject(e)
      })
  })
}

/** @name 清空主进程yaklang版本缓存 */
export const grpcClearLocalYaklangVersionCache: APINoRequestFunc<boolean> = (hiddenError) => {
  return new Promise(async (resolve, reject) => {
    yakitEngine
      .clearLocalYaklangVersionCache()
      .then(() => {
        resolve(true)
      })
      .catch((e: any) => {
        if (!hiddenError) yakitNotify('error', tOriginal('Grpc.clear_version_cache_failed', { error: e }))
        reject(e)
      })
  })
}

/** @name 安装指定版本Yak引擎 */
export const grpcInstallYak: APIFunc<string, boolean> = (version, hiddenError) => {
  return new Promise(async (resolve, reject) => {
    yakitEngine
      .installYakEngine(version)
      .then(() => {
        resolve(true)
      })
      .catch((e: any) => {
        if (!hiddenError) yakitNotify('error', tOriginal('Grpc.install_yak_failed', { version, error: e }))
        reject(e)
      })
  })
}

/** @name 取消下载指定版本Yak引擎 */
export const grpcCancelDownloadYakEngineVersion: APIFunc<string, boolean> = (version, hiddenError) => {
  return new Promise(async (resolve, reject) => {
    yakitEngine
      .cancelDownloadYakEngineVersion(version)
      .then(() => {
        resolve(true)
      })
      .catch((e: any) => {
        if (!hiddenError) yakitNotify('error', tOriginal('Grpc.cancel_download_yak_failed', { version, error: e }))
        reject(e)
      })
  })
}

/** @name OSS域名 */
let ossDomain: string = ''
export const grpcFetchLatestOSSDomain: APINoRequestFunc<string> = (hiddenError) => {
  return new Promise(async (resolve, reject) => {
    if (ossDomain && ossDomain.length > 0) {
      resolve(ossDomain)
      return
    }
    yakitEngine
      .getAvailableOSSDomain()
      .then((domain: string) => {
        ossDomain = domain
        resolve(domain)
      })
      .catch(reject)
  })
}

/** @name 打开引擎文件位置 */
export const grpcOpenYaklangPath: APINoRequestFunc<boolean> = (hiddenError) => {
  return new Promise(async (resolve, reject) => {
    yakitShell
      .openYaklangPath()
      .then(() => {
        resolve(true)
      })
      .catch((e: any) => {
        if (!hiddenError) yakitNotify('error', tOriginal('Grpc.open_yaklang_path_failed', { error: e }))
        reject(e)
      })
  })
}

/** @name 引擎连接前校验 */
export const grpcCheckAllowSecretLocal: APIFunc<CheckAllowSecretLocal, AllowSecretLocalExecResult> = (
  params,
  hiddenError,
) => {
  return new Promise(async (resolve, reject) => {
    yakitEngine
      .checkAllowSecretLocalYaklangEngine(params)
      .then((res) => {
        resolve(res)
      })
      .catch((err) => {
        reject(err)
      })
  })
}

/** @name 修复数据库 */
export const grpcFixupDatabase: APIFunc<FixupDatabase, FixupDatabaseExecResult> = (params, hiddenError) => {
  return new Promise(async (resolve, reject) => {
    yakitEngine
      .fixupDatabase(params)
      .then((res) => {
        resolve(res)
      })
      .catch((err) => {
        reject(err)
      })
  })
}

/** @name 回收数据库空间 */
export const grpcReclaimDatabaseSpace: APIFunc<ReclaimDatabaseSpace, ExecResult> = (params, hiddenError) => {
  return new Promise(async (resolve, reject) => {
    yakitEngine
      .reclaimDatabaseSpace(params)
      .then((res) => {
        resolve(res)
      })
      .catch((err) => {
        reject(err)
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
        if (!hiddenError) yakitNotify('error', tOriginal('Grpc.fetch_local_yakit_version_failed', { error: e }))
        reject(e)
      })
  })
}

/** @name 获取Yakit最新版本号 */
interface GrpcToHTTPRequestProps {
  timeout?: number
}
export const grpcFetchLatestYakitVersion: APIOptionalFunc<GrpcToHTTPRequestProps, string> = (config, hiddenError) => {
  return new Promise(async (resolve, reject) => {
    yakitEngine
      .fetchLatestYakitVersion({
        config: config,
        releaseEditionName: getReleaseEditionName(),
      })
      .then(resolve)
      .catch((e) => {
        if (!hiddenError) yakitNotify('error', tOriginal('Grpc.fetch_latest_yakit_version_failed', { error: e }))
        reject(e)
      })
  })
}

/** @name 下载指定版本yakit */
export const grpcDownloadYakit: APIFunc<string, string> = (version, hiddenError) => {
  return new Promise(async (resolve, reject) => {
    yakitEngine
      .downloadLatestYakit(version, {
        isEnterprise: isEnterpriseEdition(),
        isIRify: isIRify(),
        isMemfit: isMemfit(),
      })
      .then(resolve)
      .catch((e) => {
        if (!hiddenError) yakitNotify('error', tOriginal('Grpc.download_yakit_failed', { error: e }))
        reject(e)
      })
  })
}

/** @name 取消下载指定版本Yakit */
export const grpcCancelDownloadYakit: APINoRequestFunc<boolean> = (hiddenError) => {
  return new Promise(async (resolve, reject) => {
    yakitEngine
      .cancelDownloadYakitVersion()
      .then(() => {
        resolve(true)
      })
      .catch((e: any) => {
        if (!hiddenError) yakitNotify('error', tOriginal('Grpc.cancel_download_yakit_failed', { error: e }))
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
        if (!hiddenError) yakitNotify('error', tOriginal('Grpc.fetch_local_yak_version_failed', { error: e }))
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
        if (!hiddenError) yakitNotify('error', tOriginal('Grpc.fetch_specified_yak_hash_failed', { error: e }))
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
        if (!hiddenError) yakitNotify('error', tOriginal('Grpc.fetch_local_yak_hash_failed', { error: e }))
        reject(e)
      })
  })
}

/** @name 引擎启动 */
export const grpcStartLocalEngine: APIFunc<StartLocalEngine, ExecResult> = (params, hiddenError) => {
  return new Promise(async (resolve, reject) => {
    yakitEngine
      .startSecretLocalYaklangEngine(params)
      .then((res) => {
        resolve(res)
      })
      .catch((err) => {
        reject(err)
      })
  })
}

/** @name 检测是否连接成功 */
export const isEngineConnectionAlive = () => {
  const text = randomString(30)
  return yakitEngine.echo({ text }).then((res: { result: string }) => {
    if (res.result !== text) {
      throw Error(`Engine dead`)
    }
    return true
  })
}

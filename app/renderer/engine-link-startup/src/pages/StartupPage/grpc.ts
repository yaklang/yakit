import {yakitNotify} from "@/utils/notification"
import {APIFunc, APINoRequestFunc, APIOptionalFunc} from "@/utils/api"
import {ipcEventPre} from "@/utils/ipcEventPre"
import {
    AllowSecretLocalExecResult,
    CheckAllowSecretLocal,
    ExecResult,
    FixupDatabase,
    FixupDatabaseExecResult,
    ReclaimDatabaseSpace,
    WriteEngineKeyToYakitProjects
} from "./components/LocalEngine/LocalEngineType"
import {StartLocalEngine} from "./types"
import {randomString} from "@/utils/randomUtil"
import {getReleaseEditionName, isEnterpriseEdition, isIRify, isMemfit} from "@/utils/envfile"

const {ipcRenderer} = window.require("electron")

/** @name 插件漏洞信息库自检 */
export const grpcInitCVEDatabase: APINoRequestFunc<unknown> = (hiddenError) => {
    return new Promise(async (resolve, reject) => {
        ipcRenderer
            .invoke(ipcEventPre + "InitCVEDatabase")
            .then(resolve)
            .catch((e: any) => {
                if (!hiddenError) yakitNotify("info", `漏洞信息库检查错误：${e}`)
                reject(e)
            })
    })
}

/** @name 获取引擎是否安装的结果 */
export const grpcFetchYakInstallResult: APINoRequestFunc<boolean> = (hiddenError) => {
    return new Promise(async (resolve, reject) => {
        ipcRenderer
            .invoke(ipcEventPre + "is-yaklang-engine-installed")
            .then(resolve)
            .catch((e: any) => {
                if (!hiddenError) yakitNotify("error", "获取本地是否存在引擎结果失败:" + e)
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
        ipcRenderer
            .invoke(ipcEventPre + "GetBuildInEngineVersion")
            .then(resolve)
            .catch((e: any) => {
                if (!hiddenError) yakitNotify("error", "获取内置引擎版本失败:" + e)
                reject(e)
            })
    })
}

/** @name 解压内置引擎 */
export const grpcUnpackBuildInYak: APINoRequestFunc<unknown> = (hiddenError) => {
    return new Promise(async (resolve, reject) => {
        ipcRenderer
            .invoke(ipcEventPre + "RestoreEngineAndPlugin", {})
            .then(resolve)
            .catch((e: any) => {
                if (!hiddenError) yakitNotify("error", "解压内置引擎失败:" + e)
                reject(e)
            })
    })
}

/** @name 重启项目 */
export const grpcRelaunch: APINoRequestFunc<unknown> = (hiddenError) => {
    return new Promise(async (resolve, reject) => {
        ipcRenderer
            .invoke("relaunch")
            .then(resolve)
            .catch((e: any) => {
                if (!hiddenError) yakitNotify("error", "重启失败:" + e)
                reject(e)
            })
    })
}

/** @name 获取Yak引擎最新版本号 */
export const grpcFetchLatestYakVersion: APINoRequestFunc<string> = (hiddenError) => {
    return new Promise(async (resolve, reject) => {
        ipcRenderer
            .invoke(ipcEventPre + "fetch-latest-yaklang-version")
            .then((version: string) => {
                const newVersion = version.startsWith("v") ? version.substring(1) : version
                resolve(newVersion)
            })
            .catch((e: any) => {
                if (!hiddenError) yakitNotify("error", "获取最新引擎版本失败:" + e)
                reject(e)
            })
    })
}

/** @name 下载指定版本Yak引擎 */
export const grpcFetchDownloadYak: APIFunc<string, boolean> = (version, hiddenError) => {
    return new Promise(async (resolve, reject) => {
        ipcRenderer
            .invoke(ipcEventPre + "download-latest-yak", version)
            .then(() => {
                resolve(true)
            })
            .catch((e: any) => {
                if (!hiddenError) yakitNotify("error", version + " 下载失败：" + e)
                reject(e)
            })
    })
}

/** @name 考虑在mac下载完成后，在其yakit-projects目录下写入一个文件engine-sha256.txt，注入当前引擎hash值 */
export const grpcWriteEngineKeyToYakitProjects: APIFunc<WriteEngineKeyToYakitProjects, boolean> = (
    params,
    hiddenError
) => {
    return new Promise(async (resolve, reject) => {
        ipcRenderer
            .invoke(ipcEventPre + "write-engine-key-to-yakit-projects", params.version)
            .then(() => {
                resolve(true)
            })
            .catch((e: any) => {
                if (!hiddenError) yakitNotify("error", params.version + "写入engine-sha256.txt失败：" + e)
                reject(e)
            })
    })
}

/** @name 清空主进程yaklang版本缓存 */
export const grpcClearLocalYaklangVersionCache: APINoRequestFunc<boolean> = (hiddenError) => {
    return new Promise(async (resolve, reject) => {
        ipcRenderer
            .invoke(ipcEventPre + "clear-local-yaklang-version-cache")
            .then(() => {
                resolve(true)
            })
            .catch((e: any) => {
                if (!hiddenError) yakitNotify("error", "清除版本缓存失败：" + e)
                reject(e)
            })
    })
}

/** @name 安装指定版本Yak引擎 */
export const grpcInstallYak: APIFunc<string, boolean> = (version, hiddenError) => {
    return new Promise(async (resolve, reject) => {
        ipcRenderer
            .invoke(ipcEventPre + "install-yak-engine", version)
            .then(() => {
                resolve(true)
            })
            .catch((e: any) => {
                if (!hiddenError) yakitNotify("error", version + " 安装失败：" + e)
                reject(e)
            })
    })
}

/** @name 取消下载指定版本Yak引擎 */
export const grpcCancelDownloadYakEngineVersion: APIFunc<string, boolean> = (version, hiddenError) => {
    return new Promise(async (resolve, reject) => {
        ipcRenderer
            .invoke(ipcEventPre + "cancel-download-yak-engine-version", version)
            .then(() => {
                resolve(true)
            })
            .catch((e: any) => {
                if (!hiddenError) yakitNotify("error", version + " 取消下载失败：" + e)
                reject(e)
            })
    })
}

/** @name OSS域名 */
let ossDomain: string = ""
export const grpcFetchLatestOSSDomain: APINoRequestFunc<string> = (hiddenError) => {
    return new Promise(async (resolve, reject) => {
        if (ossDomain && ossDomain.length > 0) {
            resolve(ossDomain)
            return
        }
        ipcRenderer
            .invoke(ipcEventPre + "get-available-oss-domain")
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
        ipcRenderer
            .invoke(ipcEventPre + "open-yaklang-path")
            .then(() => {
                resolve(true)
            })
            .catch((e: any) => {
                if (!hiddenError) yakitNotify("error", "打开失败：" + e)
                reject(e)
            })
    })
}

/** @name 引擎连接前校验 */
export const grpcCheckAllowSecretLocal: APIFunc<CheckAllowSecretLocal, AllowSecretLocalExecResult> = (
    params,
    hiddenError
) => {
    return new Promise(async (resolve, reject) => {
        ipcRenderer
            .invoke(ipcEventPre + "check-allow-secret-local-yaklang-engine", params)
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
        ipcRenderer
            .invoke(ipcEventPre + "fixup-database", params)
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
        ipcRenderer
            .invoke(ipcEventPre + "reclaimDatabaseSpace", params)
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
        ipcRenderer
            .invoke(ipcEventPre + "fetch-yakit-version")
            .then((version: string) => {
                let newVersion = version
                // 如果存在-ce，则软件是 CE 版本
                if (version.endsWith("-ce")) {
                    newVersion = version.replace("-ce", "")
                }
                // 如果存在-ee，则软件是 EE 版本
                if (version.endsWith("-ee")) {
                    newVersion = version.replace("-ee", "")
                }
                resolve(newVersion)
            })
            .catch((e) => {
                if (!hiddenError) yakitNotify("error", "获取本地软件版本失败:" + e)
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
        ipcRenderer
            .invoke(ipcEventPre + "fetch-latest-yakit-version", {
                config: config,
                releaseEditionName: getReleaseEditionName()
            })
            .then(resolve)
            .catch((e) => {
                if (!hiddenError) yakitNotify("error", "获取最新软件版本失败:" + e)
                reject(e)
            })
    })
}

/** @name 下载指定版本yakit */
export const grpcDownloadYakit: APIFunc<string, string> = (version, hiddenError) => {
    return new Promise(async (resolve, reject) => {
        ipcRenderer
            .invoke(ipcEventPre + "download-latest-yakit", version, {
                isEnterprise: isEnterpriseEdition(),
                isIRify: isIRify(),
                isMemfit: isMemfit()
            })
            .then(resolve)
            .catch((e) => {
                if (!hiddenError) yakitNotify("error", "下载失败: " + e)
                reject(e)
            })
    })
}

/** @name 取消下载指定版本Yakit */
export const grpcCancelDownloadYakit: APINoRequestFunc<boolean> = (hiddenError) => {
    return new Promise(async (resolve, reject) => {
        ipcRenderer
            .invoke(ipcEventPre + "cancel-download-yakit-version")
            .then(() => {
                resolve(true)
            })
            .catch((e: any) => {
                if (!hiddenError) yakitNotify("error", "取消下载失败：" + e)
                reject(e)
            })
    })
}

/** @name 获取Yak引擎本地版本号 */
export const grpcFetchLocalYakVersion: APINoRequestFunc<string> = (hiddenError) => {
    return new Promise(async (resolve, reject) => {
        ipcRenderer
            .invoke(ipcEventPre + "get-current-yak")
            .then(resolve)
            .catch((e) => {
                if (!hiddenError) yakitNotify("error", "获取本地引擎版本失败:" + e)
                reject(e)
            })
    })
}

/** @name 获取指定Yak引擎版本号的校验Hash值 */
export const grpcFetchSpecifiedYakVersionHash: APIFunc<{version: string; config: GrpcToHTTPRequestProps}, string> = (
    request,
    hiddenError
) => {
    const {version, config} = request
    return new Promise(async (resolve, reject) => {
        ipcRenderer
            .invoke(ipcEventPre + "fetch-check-yaklang-source", version, config)
            .then(resolve)
            .catch((e) => {
                if (!hiddenError) yakitNotify("error", "获取线上引擎 hash 失败:" + e)
                reject(e)
            })
    })
}

/** @name 获取本地Yak引擎的校验Hash值 */
export const grpcFetchLocalYakVersionHash: APINoRequestFunc<string[]> = (hiddenError) => {
    return new Promise(async (resolve, reject) => {
        ipcRenderer
            .invoke(ipcEventPre + "CalcEngineSha265")
            .then(resolve)
            .catch((e) => {
                if (!hiddenError) yakitNotify("error", "获取本地引擎 hash 失败:" + e)
                reject(e)
            })
    })
}

/** @name 引擎启动 */
export const grpcStartLocalEngine: APIFunc<StartLocalEngine, ExecResult> = (params, hiddenError) => {
    return new Promise(async (resolve, reject) => {
        ipcRenderer
            .invoke(ipcEventPre + "start-secret-local-yaklang-engine", params)
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
    return ipcRenderer.invoke(ipcEventPre + "Echo", {text}).then((res: {result: string}) => {
        if (res.result !== text) {
            throw Error(`Engine dead`)
        }
        return true
    })
}

import {yakitNotify} from "@/utils/notification"
import {APIFunc, APINoRequestFunc, APIOptionalFunc} from "./type"
import {fetchEnv, getReleaseEditionName} from "@/utils/envfile"

const {ipcRenderer} = window.require("electron")

interface GrpcToHTTPRequestProps {
    timeout?: number
}

/** @name 获取Yakit最新版本号 */
export const grpcFetchLatestYakitVersion: APIOptionalFunc<GrpcToHTTPRequestProps, string> = (config, hiddenError) => {
    return new Promise(async (resolve, reject) => {
        ipcRenderer
            .invoke("fetch-latest-yakit-version", {
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

let ossDomain: string = ""

/** @name OSS域名 */
export const grpcFetchLatestOSSDomain: APINoRequestFunc<string> = (hiddenError) => {
    return new Promise(async (resolve, reject) => {
        if (ossDomain && ossDomain.length > 0) {
            resolve(ossDomain)
            return
        }
        ipcRenderer
            .invoke("get-available-oss-domain")
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
        ipcRenderer
            .invoke("fetch-latest-yaklang-version")
            .then((version: string) => {
                const newVersion = version.startsWith("v") ? version.substring(1) : version
                resolve(newVersion)
            })
            .catch((e) => {
                if (!hiddenError) yakitNotify("error", "获取最新引擎版本失败:" + e)
                reject(e)
            })
    })
}

/** @name 获取Yakit本地版本号 */
export const grpcFetchLocalYakitVersion: APINoRequestFunc<string> = (hiddenError) => {
    return new Promise(async (resolve, reject) => {
        ipcRenderer
            .invoke("fetch-yakit-version")
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

/** @name 获取Yak引擎本地版本号 */
export const grpcFetchLocalYakVersion: APINoRequestFunc<string> = (hiddenError) => {
    return new Promise(async (resolve, reject) => {
        ipcRenderer
            .invoke("get-current-yak")
            .then(resolve)
            .catch((e) => {
                if (!hiddenError) yakitNotify("error", "获取本地引擎版本失败:" + e)
                reject(e)
            })
    })
}

/** @name 获取引擎是否安装的结果 */
export const grpcFetchYakInstallResult: APINoRequestFunc<boolean> = (hiddenError) => {
    return new Promise(async (resolve, reject) => {
        ipcRenderer
            .invoke("is-yaklang-engine-installed")
            .then(resolve)
            .catch((e) => {
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
            .invoke("GetBuildInEngineVersion")
            .then(resolve)
            .catch((e) => {
                if (!hiddenError) yakitNotify("error", "获取内置引擎版本失败:" + e)
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
            .invoke("fetch-check-yaklang-source", version, config)
            .then(resolve)
            .catch((e) => {
                if (!hiddenError) yakitNotify("error", "获取最新软件版本失败:" + e)
                reject(e)
            })
    })
}

/** @name 获取本地Yak引擎的校验Hash值 */
export const grpcFetchLocalYakVersionHash: APINoRequestFunc<string[]> = (hiddenError) => {
    return new Promise(async (resolve, reject) => {
        ipcRenderer
            .invoke("CalcEngineSha265")
            .then(resolve)
            .catch((e) => {
                if (!hiddenError) yakitNotify("error", "获取本地引擎 hash 失败:" + e)
                reject(e)
            })
    })
}

/** @name 获取本地启动引擎可用的端口号 */
export const grpcFetchAvaiableProt: APINoRequestFunc<number> = (hiddenError) => {
    return new Promise(async (resolve, reject) => {
        ipcRenderer
            .invoke("get-avaiable-port")
            .then(resolve)
            .catch((e) => {
                try {
                    const {message} = e
                    const error = message.split("'get-avaiable-port':").pop()
                    if (!hiddenError) yakitNotify("error", "获取可用端口失败:" + error)
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
        ipcRenderer
            .invoke("determine-adapted-version-engine", {port: port, version: fetchEnv() || "yakit"})
            .then(resolve)
            .catch((e) => {
                if (!hiddenError) yakitNotify("error", "判断已运行引擎的适配版本失败:" + e)
                reject(e)
            })
    })
}

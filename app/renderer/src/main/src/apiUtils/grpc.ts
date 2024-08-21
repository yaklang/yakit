import {yakitNotify} from "@/utils/notification"
import {APINoRequestFunc} from "./type"
import {isCommunityEdition} from "@/utils/envfile"

const {ipcRenderer} = window.require("electron")

/** @name 获取Yakit最新版本号 */
export const grpcFetchLatestYakitVersion: APINoRequestFunc<string> = (hiddenError) => {
    return new Promise(async (resolve, reject) => {
        ipcRenderer
            .invoke("fetch-latest-yakit-version", !isCommunityEdition())
            .then(resolve)
            .catch((e) => {
                if (!hiddenError) yakitNotify("error", "获取最新软件版本失败:" + e)
                reject(e)
            })
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
                // 如果存在-ee，则软件是 EE 版本
                const newVersion = version.replace("-ee", "")
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

import {APIFunc} from "@/apiUtils/type"
import {yakitNotify} from "@/utils/notification"
const {ipcRenderer} = window.require("electron")

/** @name 获取本地指纹库组列表数据 */
export const grpcFetchLocalFingerprintGroupList: APIFunc<any, any> = (request, hiddenError) => {
    return new Promise(async (resolve, reject) => {
        ipcRenderer
            .invoke("QuerySyntaxFlowRuleGroup", request)
            .then(resolve)
            .catch((e) => {
                if (!hiddenError) yakitNotify("error", "查询本地指纹组失败:" + e)
                reject(e)
            })
    })
}

/** @name 创建本地指纹组 */
export const grpcCreateLocalFingerprintGroup: APIFunc<any, any> = (request, hiddenError) => {
    return new Promise(async (resolve, reject) => {
        ipcRenderer
            .invoke("CreateSyntaxFlowRuleGroup", request)
            .then(resolve)
            .catch((e) => {
                if (!hiddenError) yakitNotify("error", "创建本地指纹组失败:" + e)
                reject(e)
            })
    })
}

/** @name 更新本地指纹组 */
export const grpcUpdateLocalFingerprintGroup: APIFunc<any, any> = (request, hiddenError) => {
    return new Promise(async (resolve, reject) => {
        ipcRenderer
            .invoke("UpdateSyntaxFlowRuleGroup", request)
            .then(resolve)
            .catch((e) => {
                if (!hiddenError) yakitNotify("error", "更新本地指纹组失败:" + e)
                reject(e)
            })
    })
}

/** @name 删除本地指纹组 */
export const grpcDeleteLocalFingerprintGroup: APIFunc<any, any> = (request, hiddenError) => {
    return new Promise(async (resolve, reject) => {
        ipcRenderer
            .invoke("DeleteSyntaxFlowRuleGroup", request)
            .then(resolve)
            .catch((e) => {
                if (!hiddenError) yakitNotify("error", "删除本地指纹组失败:" + e)
                reject(e)
            })
    })
}

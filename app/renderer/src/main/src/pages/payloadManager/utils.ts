import {APIFunc, APINoRequestFunc} from "@/apiUtils/type"
import {NetWorkApi} from "@/services/fetch"
import {API} from "@/services/swagger/resposeType"

/**
 * @description 查询线上payload列表
 * @param query
 * @returns
 */
export const apiGetOnlinePayloadList: APIFunc<API.PayloadRequest, API.PayloadResponse> = (query) => {
    return new Promise((resolve, reject) => {
        try {
            NetWorkApi<API.PayloadRequest, API.PayloadResponse>({
                method: "post",
                url: "payload",
                data: query
            })
                .then(resolve)
                .catch((err) => {
                    reject(err)
                })
        } catch (error) {
            reject(error)
        }
    })
}

/**
 * @description 删除线上payload列表
 * @param query
 * @returns
 */
export const apiDeleteOnlinePayloadList: APIFunc<API.DeletePayloadRequest, API.ActionSucceeded> = (query) => {
    return new Promise((resolve, reject) => {
        try {
            NetWorkApi<API.DeletePayloadRequest, API.ActionSucceeded>({
                method: "delete",
                url: "payload",
                data: query
            })
                .then(resolve)
                .catch((err) => {
                    reject(err)
                })
        } catch (error) {
            reject(error)
        }
    })
}

/**
 * @description 查询线上payload分组信息
 * @param query
 * @returns
 */
export const apiGetOnlinePayloadGroup: APINoRequestFunc< API.PayloadGroupResponse> = () => {
    return new Promise((resolve, reject) => {
        try {
            NetWorkApi<null, API.PayloadGroupResponse>({
                method: "get",
                url: "payload/group",
            })
                .then(resolve)
                .catch((err) => {
                    reject(err)
                })
        } catch (error) {
            reject(error)
        }
    })
}


/**
 * @description 查询线上payload文件内容
 * @param query
 * @returns
 */
interface OnlinePayloadFileProps {
    group?: string
    folder?: string
}
export const apiGetOnlinePayloadFile: APIFunc<OnlinePayloadFileProps, API.PayloadFromFileResponse> = (query) => {
    return new Promise((resolve, reject) => {
        try {
            NetWorkApi<OnlinePayloadFileProps, API.PayloadFromFileResponse>({
                method: "get",
                url: "payloads/from/file",
                params: {
                    ...query
                }
            })
                .then(resolve)
                .catch((err) => {
                    reject(err)
                })
        } catch (error) {
            reject(error)
        }
    })
}

/**
 * @description 编辑线上payload文件内容
 * @param query
 * @returns
 */
export const apiUpdateOnlinePayload: APIFunc<API.UpdatePayloadRequest, API.ActionSucceeded> = (query) => {
    return new Promise((resolve, reject) => {
        try {
            NetWorkApi<API.UpdatePayloadRequest, API.ActionSucceeded>({
                method: "post",
                url: "update/payload",
                data: query
            })
                .then(resolve)
                .catch((err) => {
                    reject(err)
                })
        } catch (error) {
            reject(error)
        }
    })
}

/**
 * @description 修改线上payload文件内容
 * @param query
 * @returns
 */
interface UpdateOnlinePayloadFileProps {
    groupName: string
    content: string
}
export const apiUpdateOnlinePayloadFile: APIFunc<UpdateOnlinePayloadFileProps, API.ActionSucceeded> = (query) => {
    return new Promise((resolve, reject) => {
        try {
            NetWorkApi<UpdateOnlinePayloadFileProps, API.ActionSucceeded>({
                method: "post",
                url: "update/payload/file",
                data: query
            })
                .then(resolve)
                .catch((err) => {
                    reject(err)
                })
        } catch (error) {
            reject(error)
        }
    })
}

/**
 * @description 重命名
 * @param query
 * @returns
 */
export const apiRenameOnlinePayload: APIFunc<API.RenamePayloadRequest, API.ActionSucceeded> = (query) => {
    return new Promise((resolve, reject) => {
        try {
            NetWorkApi<API.RenamePayloadRequest, API.ActionSucceeded>({
                method: "post",
                url: "rename/payload",
                data: query
            })
                .then(resolve)
                .catch((err) => {
                    reject(err)
                })
        } catch (error) {
            reject(error)
        }
    })
}
import {NetWorkApi} from "@/services/fetch"
import {API} from "@/services/swagger/resposeType"

export interface MessageQueryParamsProps {
    page: number
    limit: number
}

export interface MessageQueryDataProps {
    afterId?: number
    beforeId?: number
    isRead?: string
}

interface MessageQueryProps {}

/** 获取消息中心数据 */
export const apiFetchQueryMessage: (
    params: MessageQueryParamsProps,
    data?: MessageQueryDataProps
) => Promise<API.MessageLogResponse> = (params, data) => {
    return new Promise((resolve, reject) => {
        try {
            NetWorkApi<MessageQueryProps, API.MessageLogResponse>({
                method: "get",
                url: "message/log",
                params,
                data
            })
                .then((res) => {
                    resolve(res)
                })
                .catch((err) => {
                    reject(err)
                })
                .finally(() => {})
        } catch (error) {
            reject(error)
        }
    })
}
interface MessageQueryReadProps {
    isAll: boolean
    hash: string
}
/** 消息中心已读操作 */
export const apiFetchMessageRead: (data: MessageQueryReadProps) => Promise<boolean> = (data) => {
    return new Promise((resolve, reject) => {
        try {
            NetWorkApi<MessageQueryProps, API.ActionSucceeded>({
                method: "post",
                url: "message/log",
                data
            })
                .then((res) => {
                    resolve(res.ok)
                })
                .catch((err) => {
                    reject(err)
                })
                .finally(() => {})
        } catch (error) {
            reject(error)
        }
    })
}


/** 消息中心删除操作 */
export const apiFetchMessageClear: (data: MessageQueryReadProps) => Promise<boolean> = (data) => {
    return new Promise((resolve, reject) => {
        try {
            NetWorkApi<MessageQueryProps, API.ActionSucceeded>({
                method: "delete",
                url: "message/log",
                data
            })
                .then((res) => {
                    resolve(res.ok)
                })
                .catch((err) => {
                    reject(err)
                })
                .finally(() => {})
        } catch (error) {
            reject(error)
        }
    })
}
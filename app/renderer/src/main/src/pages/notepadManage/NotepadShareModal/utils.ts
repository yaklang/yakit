import {NetWorkApi} from "@/services/fetch"
import {API} from "@/services/swagger/resposeType"
import {yakitNotify} from "@/utils/notification"

export interface OrdinaryQuery {
    keywords: string
    role?: string
}

export const apiGetUserOrdinary: (query: OrdinaryQuery) => Promise<API.UserOrdinaryResponse> = (query) => {
    return new Promise((resolve, reject) => {
        try {
            NetWorkApi<OrdinaryQuery, API.UserOrdinaryResponse>({
                method: "get",
                url: "user/ordinary",
                params: {
                    ...query
                }
            })
                .then(resolve)
                .catch((err) => {
                    yakitNotify("error", "获取普通用户失败：" + err)
                })
        } catch (error) {
            reject(error)
        }
    })
}

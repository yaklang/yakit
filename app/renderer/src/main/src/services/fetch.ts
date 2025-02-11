import {UserInfoProps} from "@/store"
import {loginOutLocal} from "@/utils/login"
import {failed} from "@/utils/notification"
import {AxiosRequestConfig, AxiosResponse} from "./axios"
import {globalUserLogout} from "@/utils/envfile"

const {ipcRenderer} = window.require("electron")

interface AxiosResponseInfoProps {
    message?: string
    reason?: string
    userInfo?: UserInfoProps
}

// 批量覆盖
type Merge<M, N> = Omit<M, Extract<keyof M, keyof N>> & N

type AxiosResponseProps<T = any, D = any> = Merge<
    AxiosResponse<T, D>,
    {
        code?: number
        message?: string
    }
>

export interface requestConfig<T = any> extends AxiosRequestConfig<T> {
    params?: T
    /** @name 自定义接口域名 */
    diyHome?: string
}

export function NetWorkApi<T, D>(params: requestConfig<T>): Promise<D> {
    return new Promise((resolve, reject) => {
        // console.log("request-params", params)
        ipcRenderer
            .invoke("axios-api", params)
            .then((res) => {
                // 埋点接口 不论结果如何 不可影响页面及交互
                if (params.url === "tourist" && params.method === "POST") {
                    resolve("" as any)
                    return
                }
                handleAxios(res, resolve, reject)
            })
            .catch((err: any) => {
                // console.log("request-err", err)
                reject(err)
            })
    })
}

export const handleAxios = (res: AxiosResponseProps<AxiosResponseInfoProps>, resolve, reject) => {
    const {code, message, data} = res
    // console.log("返回", res)
    if (!code) {
        failed("请求超时，请重试")
        reject("请求超时，请重试")
        return
    }
    switch (code) {
        case 200:
            resolve(data)
            break
        case 209:
            reject(data.reason)
            break
        case 401:
            tokenOverdue(res)
            reject(message)
            break
        default:
            reject(message)
            break
    }
}

// token过期，退出
export const tokenOverdue = (res) => {
    if (res.userInfo) loginOutLocal(res.userInfo)
    // 异常过期 无法通过接口更新连接状态 故只作退出远程处理
    ipcRenderer.invoke("lougin-out-dynamic-control", {loginOut: false})
    globalUserLogout()
    failed("401,登录过期/未登录，请重新登录")
}

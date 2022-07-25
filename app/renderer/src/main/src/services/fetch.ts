import {UserInfoProps, useStore} from "@/store"
import {failed} from "@/utils/notification"
import {AxiosRequestConfig, AxiosResponse} from "./axios"

const {ipcRenderer} = window.require("electron")

interface AxiosResponseInfoProps {
    message?: string
    reason?: string
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

interface requestConfig<T = any> extends AxiosRequestConfig<T> {
    params?: T
}

export function NetWorkApi<T, D>(params: requestConfig<T>): Promise<D> {
    return new Promise((resolve, reject) => {
        // console.log("request-params", params)
        ipcRenderer
            .invoke("axios-api", params)
            .then((res) => {
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
    if (!code) {
        failed("请求超时，请重试")
        return
    }
    // console.log("返回", res)
    switch (code) {
        case 200:
            resolve(data)
            break
        case 209:
            reject(data.reason)
            break
        case 401:
            // loginOut()
            break
        default:
            reject(message)
            break
    }
}

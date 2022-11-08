/*
 * @Author: TangHang123 1425735414@qq.com
 * @Date: 2022-10-21 14:04:01
 * @LastEditors: TangHang123 1425735414@qq.com
 * @LastEditTime: 2022-11-08 16:44:48
 * @FilePath: \yakit\app\renderer\src\main\src\services\fetch.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import {UserInfoProps, useStore} from "@/store"
import {setRemoteValue} from "@/utils/kv"
import {loginOut, loginOutLocal} from "@/utils/login"
import {failed} from "@/utils/notification"
import {AxiosRequestConfig, AxiosResponse} from "./axios"

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
    // console.log("返回", res)
    if (!code) {
        failed("请求超时，请重试")
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
            break
        default:
            reject(message)
            break
    }
}

// token过期，退出
const tokenOverdue = (res) => {
    if (res.userInfo) loginOutLocal(res.userInfo)
    setRemoteValue("token-online", "")
    failed("401,登录过期/未登录，请重新登录")
}

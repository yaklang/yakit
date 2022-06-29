import {AxiosError} from "./axios"
import {failed} from "./notification"

const {ipcRenderer} = window.require("electron")

interface AxiosErrorInfoProps {
    message: string
}

export function NetWorkApi<T, D>(params: T): Promise<D> {
    return new Promise((resolve, reject) => {
        ipcRenderer
            .invoke("axios-api", params)
            .then((res) => {
                resolve(res)
            })
            .catch((err: AxiosError<AxiosErrorInfoProps>) => {
                reject(err)
            })
    })
}

export const handleAxiosError = (code: number, data: AxiosErrorInfoProps) => {
    if (!code) {
        failed("请求超时，请重试")
        return
    }
    switch (code) {
        case 201:
            failed(data.message)
            return

        default:
            break
    }
}

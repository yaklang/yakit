import {yakitNotify} from "@/utils/notification"
import {APIOptionalFunc} from "@/apiUtils/type"
import {QuerySSAProgramRequest, QuerySSAProgramResponse} from "./YakRunnerScanHistory"

const {ipcRenderer} = window.require("electron")

/** 获取QuerySSAPrograms */
export const apiQuerySSAPrograms: APIOptionalFunc<
    QuerySSAProgramRequest,
    QuerySSAProgramResponse
> = (params) => {
    return new Promise((resolve, reject) => {
        ipcRenderer
            .invoke("QuerySSAPrograms", params)
            .then((res: QuerySSAProgramResponse) => {
                resolve(res)
            })
            .catch((e) => {
                reject(e)
                yakitNotify("error", "QuerySSAPrograms：" + e)
            })
    })
}

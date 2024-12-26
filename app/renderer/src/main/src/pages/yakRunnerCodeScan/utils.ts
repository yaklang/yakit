import {info, yakitNotify} from "@/utils/notification"
import {
    DeleteSyntaxFlowResultRequest,
    DeleteSyntaxFlowResultResponse,
    QuerySyntaxFlowResultRequest,
    QuerySyntaxFlowResultResponse,
    SyntaxFlowScanRequest
} from "./YakRunnerCodeScanType"
import {APIOptionalFunc} from "@/apiUtils/type"

const {ipcRenderer} = window.require("electron")

/**
 * @description SyntaxFlowScan 规则执行
 */
export const apiSyntaxFlowScan: (params: SyntaxFlowScanRequest, token: string) => Promise<null> = (params, token) => {
    return new Promise((resolve, reject) => {
        try {
            ipcRenderer
                .invoke(
                    "SyntaxFlowScan",
                    {
                        ...params
                    } as SyntaxFlowScanRequest,
                    token
                )
                .then(() => {
                    info(`启动成功,任务ID: ${token}`)
                    resolve(null)
                })
        } catch (error) {
            yakitNotify("error", "规则执行出错:" + error)
            reject(error)
        }
    })
}

/**
 * @description SyntaxFlowScan 取消规则执行
 */
export const apiCancelSyntaxFlowScan: (token: string) => Promise<null> = (token) => {
    return new Promise((resolve, reject) => {
        ipcRenderer
            .invoke(`cancel-SyntaxFlowScan`, token)
            .then(() => {
                resolve(null)
            })
            .catch((e: any) => {
                yakitNotify("error", "取消规则执行出错:" + e)
                reject(e)
            })
    })
}

/** 获取审计结果 */
export const apiFetchQuerySyntaxFlowResult: (
    params: QuerySyntaxFlowResultRequest
) => Promise<QuerySyntaxFlowResultResponse> = (params) => {
    return new Promise((resolve, reject) => {
        const queryParams: QuerySyntaxFlowResultRequest = {
            ...params
        }
        ipcRenderer
            .invoke("QuerySyntaxFlowResult", queryParams)
            .then((res: QuerySyntaxFlowResultResponse) => {
                resolve(res)
            })
            .catch((e) => {
                reject(e)
                yakitNotify("error", "获取审计结果：" + e)
            })
    })
}

/** 删除审计结果 */
export const apiDeleteQuerySyntaxFlowResult: APIOptionalFunc<
    DeleteSyntaxFlowResultRequest,
    DeleteSyntaxFlowResultResponse
> = (params) => {
    return new Promise((resolve, reject) => {
        const queryParams: DeleteSyntaxFlowResultRequest = {
            ...params
        }
        ipcRenderer
            .invoke("DeleteSyntaxFlowResult", queryParams)
            .then((res: DeleteSyntaxFlowResultResponse) => {
                resolve(res)
            })
            .catch((e) => {
                reject(e)
                yakitNotify("error", "删除审计结果：" + e)
            })
    })
}

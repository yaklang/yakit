import {info, yakitNotify} from "@/utils/notification"
import {
    QuerySyntaxFlowResultRequest,
    QuerySyntaxFlowResultResponse,
    QuerySyntaxFlowRuleGroupRequest,
    QuerySyntaxFlowRuleGroupResponse,
    QuerySyntaxFlowRuleRequest,
    QuerySyntaxFlowRuleResponse,
    SyntaxFlowGroup,
    SyntaxFlowScanModeType,
    SyntaxFlowScanRequest
} from "./YakRunnerCodeScanType"

const {ipcRenderer} = window.require("electron")

/** 获取规则组数据 */
export const apiFetchQuerySyntaxFlowRuleGroup: (
    params: QuerySyntaxFlowRuleGroupRequest
) => Promise<SyntaxFlowGroup[]> = (params) => {
    return new Promise((resolve, reject) => {
        const queryParams: QuerySyntaxFlowRuleGroupRequest = {
            ...params
        }

        ipcRenderer
            .invoke("QuerySyntaxFlowRuleGroup", queryParams)
            .then((res: QuerySyntaxFlowRuleGroupResponse) => {
                console.log("QuerySyntaxFlowRuleGroup---", params, res)
                resolve(res.Group)
            })
            .catch((e) => {
                reject(e)
                yakitNotify("error", "获取规则组失败：" + e)
            })
    })
}

/** 获取规则组所含规则 */
export const apiFetchQuerySyntaxFlowRule: (
    params: QuerySyntaxFlowRuleRequest
) => Promise<QuerySyntaxFlowRuleResponse> = (params) => {
    return new Promise((resolve, reject) => {
        const queryParams: QuerySyntaxFlowRuleRequest = {
            ...params
        }
        ipcRenderer
            .invoke("QuerySyntaxFlowRule", queryParams)
            .then((res: QuerySyntaxFlowRuleResponse) => {
                resolve(res)
            })
            .catch((e) => {
                reject(e)
                yakitNotify("error", "获取规则失败：" + e)
            })
    })
}

/**
 * @description SyntaxFlowScan 规则执行
 */
export const apiSyntaxFlowScan: (params: SyntaxFlowScanRequest, token: string) => Promise<null> = (
    params,
    token
) => {
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
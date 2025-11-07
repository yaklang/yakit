import {info, yakitNotify} from "@/utils/notification"
import {
    DeleteSyntaxFlowResultRequest,
    DeleteSyntaxFlowResultResponse,
    QuerySyntaxFlowResultRequest,
    QuerySyntaxFlowResultResponse,
    SyntaxFlowScanRequest
} from "./YakRunnerCodeScanType"
import {APIOptionalFunc} from "@/apiUtils/type"
import {QuerySyntaxFlowRuleRequest} from "../ruleManagement/RuleManagementType"
import {grpcFetchLocalRuleList} from "../ruleManagement/api"

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

// 获取选中分组下规则总数
export const getGroupNamesTotal = (GroupNames: string[]) => {
    return new Promise<number>(async (resolve, reject) => {
        try {
            if(GroupNames.length === 0) {
                resolve(0)
                return
            }
            const query: QuerySyntaxFlowRuleRequest = {
                Filter: {
                    RuleNames: [],
                    Language: [],
                    GroupNames,
                    Severity: [],
                    Purpose: [],
                    Tag: [],
                    Keyword: "",
                    FilterLibRuleKind: ""
                },
                Pagination: {
                    Limit: 10,
                    Page: 1,
                    OrderBy: "updated_at",
                    Order: "desc"
                }
            }
            const res = await grpcFetchLocalRuleList(query)
            resolve(parseInt(res.Total + ""))
        } catch (error) {
            reject(error)
        }
    })
}

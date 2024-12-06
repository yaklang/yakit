import {APIFunc, APIOptionalFunc} from "@/apiUtils/type"
import {yakitNotify} from "@/utils/notification"
import {
    CreateSyntaxFlowGroupRequest,
    CreateSyntaxFlowRuleRequest,
    DeleteSyntaxFlowRuleGroupRequest,
    DeleteSyntaxFlowRuleRequest,
    QuerySyntaxFlowRuleGroupRequest,
    QuerySyntaxFlowRuleGroupResponse,
    QuerySyntaxFlowRuleRequest,
    QuerySyntaxFlowRuleResponse,
    SyntaxFlowRule,
    UpdateSyntaxFlowRuleGroupRequest,
    UpdateSyntaxFlowRuleRequest
} from "./RuleManagementType"

const {ipcRenderer} = window.require("electron")

/** @name 获取本地规则组列表数据 */
export const grpcFetchLocalRuleGroupList: APIOptionalFunc<
    QuerySyntaxFlowRuleGroupRequest,
    QuerySyntaxFlowRuleGroupResponse
> = (request, hiddenError) => {
    return new Promise(async (resolve, reject) => {
        ipcRenderer
            .invoke("QuerySyntaxFlowRuleGroup", request)
            .then(resolve)
            .catch((e) => {
                if (!hiddenError) yakitNotify("error", "查询本地规则组失败:" + e)
                reject(e)
            })
    })
}

/** @name 创建本地规则组 */
export const grpcCreateLocalRuleGroup: APIFunc<CreateSyntaxFlowGroupRequest, any> = (request, hiddenError) => {
    return new Promise(async (resolve, reject) => {
        ipcRenderer
            .invoke("CreateSyntaxFlowRuleGroup", request)
            .then(resolve)
            .catch((e) => {
                if (!hiddenError) yakitNotify("error", "创建本地规则组失败:" + e)
                reject(e)
            })
    })
}

/** @name 更新本地规则组 */
export const grpcUpdateLocalRuleGroup: APIFunc<UpdateSyntaxFlowRuleGroupRequest, any> = (request, hiddenError) => {
    return new Promise(async (resolve, reject) => {
        ipcRenderer
            .invoke("UpdateSyntaxFlowRuleGroup", request)
            .then(resolve)
            .catch((e) => {
                if (!hiddenError) yakitNotify("error", "更新本地规则组失败:" + e)
                reject(e)
            })
    })
}

/** @name 删除本地规则组 */
export const grpcDeleteLocalRuleGroup: APIFunc<DeleteSyntaxFlowRuleGroupRequest, any> = (request, hiddenError) => {
    return new Promise(async (resolve, reject) => {
        ipcRenderer
            .invoke("DeleteSyntaxFlowRuleGroup", request)
            .then(resolve)
            .catch((e) => {
                if (!hiddenError) yakitNotify("error", "删除本地规则组失败:" + e)
                reject(e)
            })
    })
}

/** @name 获取本地规则列表数据 */
export const grpcFetchLocalRuleList: APIFunc<QuerySyntaxFlowRuleRequest, QuerySyntaxFlowRuleResponse> = (
    request,
    hiddenError
) => {
    return new Promise(async (resolve, reject) => {
        console.log(`QuerySyntaxFlowRule-request`,JSON.stringify(request))
        ipcRenderer
            .invoke("QuerySyntaxFlowRule", request)
            .then(resolve)
            .catch((e) => {
                if (!hiddenError) yakitNotify("error", "查询本地规则组失败:" + e)
                reject(e)
            })
    })
}

/** @name 创建本地规则 */
export const grpcFetchCreateLocalRule: APIFunc<CreateSyntaxFlowRuleRequest, {rule: SyntaxFlowRule}> = (
    request,
    hiddenError
) => {
    return new Promise(async (resolve, reject) => {
        ipcRenderer
            .invoke("CreateSyntaxFlowRuleEx", request)
            .then(resolve)
            .catch((e) => {
                if (!hiddenError) yakitNotify("error", "创建本地规则失败:" + e)
                reject(e)
            })
    })
}

/** @name 更新本地规则 */
export const grpcUpdateLocalRule: APIFunc<UpdateSyntaxFlowRuleRequest, {rule: SyntaxFlowRule}> = (
    request,
    hiddenError
) => {
    return new Promise(async (resolve, reject) => {
        ipcRenderer
            .invoke("UpdateSyntaxFlowRuleEx", request)
            .then(resolve)
            .catch((e) => {
                if (!hiddenError) yakitNotify("error", "更新本地规则失败:" + e)
                reject(e)
            })
    })
}

/** @name 删除本地规则 */
export const grpcDeleteLocalRule: APIFunc<DeleteSyntaxFlowRuleRequest, any> = (request, hiddenError) => {
    return new Promise(async (resolve, reject) => {
        ipcRenderer
            .invoke("DeleteSyntaxFlowRule", request)
            .then(resolve)
            .catch((e) => {
                if (!hiddenError) yakitNotify("error", "删除本地规则失败:" + e)
                reject(e)
            })
    })
}

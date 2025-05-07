import {APIFunc} from "@/apiUtils/type"
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
    QuerySyntaxFlowSameGroupRequest,
    QuerySyntaxFlowSameGroupResponse,
    SyntaxFlowRule,
    SyntaxFlowRuleToOnlineRequest,
    UpdateSyntaxFlowRuleAndGroupRequest,
    UpdateSyntaxFlowRuleGroupRequest,
    UpdateSyntaxFlowRuleRequest
} from "./RuleManagementType"
import {NetWorkApi} from "@/services/fetch"
import {API} from "@/services/swagger/resposeType"

const {ipcRenderer} = window.require("electron")

/** @name 获取本地规则组列表数据 */
export const grpcFetchLocalRuleGroupList: APIFunc<QuerySyntaxFlowRuleGroupRequest, QuerySyntaxFlowRuleGroupResponse> = (
    request,
    hiddenError
) => {
    return new Promise(async (resolve, reject) => {
        console.log('获取本地规则组数据：', request);
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
        ipcRenderer
            .invoke("QuerySyntaxFlowRule", request)
            .then((res) => {
                resolve(res)
            })
            .catch((e) => {
                if (!hiddenError) yakitNotify("error", "查询本地规则组失败:" + e)
                reject(e)
            })
    })
}

/** @name 创建本地规则 */
export const grpcCreateLocalRule: APIFunc<CreateSyntaxFlowRuleRequest, {Rule: SyntaxFlowRule}> = (
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
export const grpcUpdateLocalRule: APIFunc<UpdateSyntaxFlowRuleRequest, {Rule: SyntaxFlowRule}> = (
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

/** @name 更新规则里的本地组 */
export const grpcUpdateRuleToGroup: APIFunc<UpdateSyntaxFlowRuleAndGroupRequest, any> = (request, hiddenError) => {
    return new Promise(async (resolve, reject) => {
        ipcRenderer
            .invoke("UpdateSyntaxFlowRuleAndGroup", request)
            .then(resolve)
            .catch((e) => {
                if (!hiddenError) yakitNotify("error", "删除本地规则失败:" + e)
                reject(e)
            })
    })
}

/** @name 查询规则集合的所属组交集 */
export const grpcFetchRulesForSameGroup: APIFunc<QuerySyntaxFlowSameGroupRequest, QuerySyntaxFlowSameGroupResponse> = (
    request,
    hiddenError
) => {
    return new Promise(async (resolve, reject) => {
        ipcRenderer
            .invoke("QuerySyntaxFlowSameGroup", request)
            .then(resolve)
            .catch((e) => {
                if (!hiddenError) yakitNotify("error", "查询规则所属于组交集失败:" + e)
                reject(e)
            })
    })
}

/** @name 规则上传 */
export const grpcSyntaxFlowRuleToOnline: (params: SyntaxFlowRuleToOnlineRequest, token: string) => Promise<unknown> = (
    request,
    token
) => {
    return new Promise(async (resolve, reject) => {
        console.log("上传：", request)
        ipcRenderer
            .invoke("SyntaxFlowRuleToOnline", request, token)
            .then(resolve)
            .catch((e) => {
                yakitNotify("error", "规则上传失败:" + e)
                reject(e)
            })
    })
}

/** @name 规则下载 */
export const grpcDownloadSyntaxFlowRule: (params: QuerySyntaxFlowRuleRequest, token: string) => Promise<unknown> = (
    request,
    token
) => {
    return new Promise(async (resolve, reject) => {
        console.log("下载：", request)
        ipcRenderer
            .invoke("DownloadSyntaxFlowRule", request, token)
            .then(resolve)
            .catch((e) => {
                yakitNotify("error", "规则下载失败:" + e)
                reject(e)
            })
    })
}

/** @name 获取线上规则组列表数据 */
export const httpFetchOnlineRuleGroupList: APIFunc<API.FlowRuleGroupRequest, API.FlowRuleGroupResponse> = (request) => {
    return new Promise((resolve, reject) => {
        console.log("获取线上规则组列表：", request)
        NetWorkApi<API.FlowRuleGroupRequest, API.FlowRuleGroupResponse>({
            method: "post",
            url: "flow/rule/group",
            data: request
        })
            .then(resolve)
            .catch((err) => {
                reject(err)
                yakitNotify("error", "获取线上规则组失败：" + err)
            })
    })
}

/** @name 删除线上规则组 */
export const httpDeleteOnlineRuleGroup: APIFunc<API.FlowRuleGroupWhere, API.ActionSucceeded> = (request) => {
    return new Promise(async (resolve, reject) => {
        console.log("删除线上规则组：", request)
        NetWorkApi<API.FlowRuleGroupWhere, API.ActionSucceeded>({
            method: "delete",
            url: "flow/rule/group",
            data: request
        })
            .then(resolve)
            .catch((err) => {
                reject(err)
                yakitNotify("error", "线上规则组删除失败：" + err)
            })
    })
}

/** @name 获取线上规则列表数据 */
export const httpFetchOnlineRuleList: APIFunc<API.FlowRuleRequest, API.FlowRuleResponse> = (request) => {
    return new Promise(async (resolve, reject) => {
        console.log("获取线上规则列表：", request)
        NetWorkApi<API.FlowRuleRequest, API.FlowRuleResponse>({
            method: "post",
            url: "flow/rule",
            data: request
        })
            .then(resolve)
            .catch((err) => {
                reject(err)
                yakitNotify("error", "查询线上规则组失败:" + err)
            })
    })
}

/** @name 线上删除本地规则 */
export const httpDeleteOnlineRule: APIFunc<API.FlowRuleRequest, API.ActionSucceeded> = (request) => {
    console.log("线上删除本地规则：", request)
    return new Promise(async (resolve, reject) => {
        NetWorkApi<API.FlowRuleRequest, API.ActionSucceeded>({
            method: "delete",
            url: "flow/rule",
            data: request
        })
            .then(resolve)
            .catch((err) => {
                reject(err)
                yakitNotify("error", "删除线上规则失败:" + err)
            })
    })
}

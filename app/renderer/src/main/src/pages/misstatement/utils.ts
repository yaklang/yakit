import {APIFunc, APINoRequestFunc} from "@/apiUtils/type"
import {NetWorkApi} from "@/services/fetch"
import {API} from "@/services/swagger/resposeType"
import {yakitNotify} from "@/utils/notification"

export const httpRiskFeedBackGroup: APINoRequestFunc<API.Fields> = (params) => {
    return new Promise((resolve, reject) => {
        NetWorkApi<unknown, API.Fields>({
            method: "get",
            url: "risk/feed/back/group"
        })
            .then(resolve)
            .catch((err) => {
                reject(err)
                yakitNotify("error", "获取插件误报数统计失败：" + err)
            })
    })
}

export interface RiskFeedBackRequest extends API.RiskFeedBackRequest {
    riskTypeList?: string[] // 用于前端类型筛选
    severityList?: string[] // 用于前端等级筛选
    tagList?: string[] // 用于前端等级筛选
}

export const httpGetRiskList: APIFunc<API.RiskFeedBackRequest, API.RiskFeedBackResponse> = (params) => {
    return new Promise((resolve, reject) => {
        NetWorkApi<API.RiskFeedBackRequest, API.RiskFeedBackResponse>({
            method: "post",
            url: "risk/feed/back/list",
            data: params
        })
            .then(resolve)
            .catch((err) => {
                reject(err)
                yakitNotify("error", "获取插件误报反馈列表失败：" + err)
            })
    })
}

export const httpDelRiskList: APIFunc<API.GetRiskWhere, API.ActionSucceeded> = (params) => {
    return new Promise((resolve, reject) => {
        NetWorkApi<API.GetRiskWhere, API.ActionSucceeded>({
            method: "delete",
            url: "risk/feed/back",
            data: params
        })
            .then(resolve)
            .catch((err) => {
                reject(err)
                yakitNotify("error", "删除插件误报反馈失败：" + err)
            })
    })
}

export const httpRiskFeedBackType: APINoRequestFunc<API.Fields> = (params) => {
    return new Promise((resolve, reject) => {
        NetWorkApi<unknown, API.Fields>({
            method: "get",
            url: "risk/feed/back/type"
        })
            .then(resolve)
            .catch((err) => {
                reject(err)
                yakitNotify("error", "" + err)
            })
    })
}

export const httpRiskFeedBackTags: APINoRequestFunc<API.GroupTableColumnResponse> = (params) => {
    return new Promise((resolve, reject) => {
        NetWorkApi<unknown, API.GroupTableColumnResponse>({
            method: "get",
            url: "risk/feed/back/tags"
        })
            .then(resolve)
            .catch((err) => {
                reject(err)
                yakitNotify("error", "" + err)
            })
    })
}

export const httpAuditHoleGroup: APINoRequestFunc<API.Fields> = (params) => {
    return new Promise((resolve, reject) => {
        NetWorkApi<unknown, API.Fields>({
            method: "get",
            url: "ssa/risk/group"
        })
            .then(resolve)
            .catch((err) => {
                reject(err)
                yakitNotify("error", "获取规则误报数统计失败：" + err)
            })
    })
}

export const httpGetAuditHoleList: APIFunc<API.SSARiskWhereRequest, API.SSARiskResponse> = (params) => {
    return new Promise((resolve, reject) => {
        NetWorkApi<API.SSARiskWhereRequest, API.SSARiskResponse>({
            method: "post",
            url: "ssa/risk",
            data: params
        })
            .then(resolve)
            .catch((err) => {
                reject(err)
                yakitNotify("error", "获取规则误报反馈列表失败：" + err)
            })
    })
}

export const httpDelAuditHoleList: APIFunc<API.SSARiskWhere, API.ActionSucceeded> = (params) => {
    return new Promise((resolve, reject) => {
        NetWorkApi<API.SSARiskWhere, API.ActionSucceeded>({
            method: "delete",
            url: "ssa/risk",
            data: params
        })
            .then(resolve)
            .catch((err) => {
                reject(err)
                yakitNotify("error", "删除规则误报反馈失败：" + err)
            })
    })
}

export interface AuditHoleTableColumn {
    type: "risk_type" | "program_name"
}
export const httpAuditHoleTableColumn: APIFunc<AuditHoleTableColumn, API.GroupTableColumnResponse> = (params) => {
    return new Promise((resolve, reject) => {
        NetWorkApi<AuditHoleTableColumn, API.GroupTableColumnResponse>({
            method: "get",
            url: "group/table/column",
            params: params
        })
            .then(resolve)
            .catch((err) => {
                reject(err)
                yakitNotify("error", "" + err)
            })
    })
}

export const httpAuditHoleTags: APINoRequestFunc<API.GroupTableColumnResponse> = (params) => {
    return new Promise((resolve, reject) => {
        NetWorkApi<unknown, API.GroupTableColumnResponse>({
            method: "get",
            url: "ssa/risk/tags"
        })
            .then(resolve)
            .catch((err) => {
                reject(err)
                yakitNotify("error", "" + err)
            })
    })
}

import {APIFunc, APINoRequestFunc} from "@/apiUtils/type"
import {yakitNotify} from "@/utils/notification"
import {DbOperateMessage} from "../layout/mainOperatorContent/utils"
import {Paging} from "@/utils/yakQueryHTTPFlow"
const {ipcRenderer} = window.require("electron")

export interface FingerprintGroup {
    GroupName: string
    Count: number
}
interface FingerprintGroups {
    Data: FingerprintGroup[]
}
/** @name 获取本地指纹组列表数据 */
export const grpcFetchLocalFingerprintGroupList: APINoRequestFunc<FingerprintGroups> = () => {
    return new Promise(async (resolve, reject) => {
        ipcRenderer
            .invoke("GetAllFingerprintGroup")
            .then(resolve)
            .catch((e) => {
                yakitNotify("error", "查询本地指纹组失败：" + e)
                reject(e)
            })
    })
}

/** @name 创建本地指纹组 */
export const grpcCreateLocalFingerprintGroup: APIFunc<FingerprintGroup, DbOperateMessage> = (request) => {
    return new Promise(async (resolve, reject) => {
        ipcRenderer
            .invoke("CreateFingerprintGroup", request)
            .then(resolve)
            .catch((e) => {
                yakitNotify("error", "创建本地指纹组失败：" + e)
                reject(e)
            })
    })
}

interface RenameFingerprintGroupRequest {
    GroupName: string
    NewGroupName: string
}
/** @name 更新本地指纹组 */
export const grpcUpdateLocalFingerprintGroup: APIFunc<RenameFingerprintGroupRequest, DbOperateMessage> = (
    request,
    hiddenError
) => {
    return new Promise(async (resolve, reject) => {
        ipcRenderer
            .invoke("RenameFingerprintGroup", request)
            .then(resolve)
            .catch((e) => {
                if (!hiddenError) yakitNotify("error", "更新本地指纹组失败:" + e)
                reject(e)
            })
    })
}

interface DeleteFingerprintGroupRequest {
    GroupNames: string[]
}
/** @name 删除本地指纹组 */
export const grpcDeleteLocalFingerprintGroup: APIFunc<DeleteFingerprintGroupRequest, DbOperateMessage> = (
    request,
    hiddenError
) => {
    return new Promise(async (resolve, reject) => {
        ipcRenderer
            .invoke("DeleteFingerprintGroup", request)
            .then(resolve)
            .catch((e) => {
                if (!hiddenError) yakitNotify("error", "删除本地指纹组失败:" + e)
                reject(e)
            })
    })
}

export interface FingerprintFilter {
    Vendor?: string[]
    Product?: string[]
    IncludeId?: number[]
    GroupName?: string[]
}
export interface QueryFingerprintRequest {
    Filter: FingerprintFilter
    Pagination: Paging
}
interface CPE {
    Part: string
    Vendor: string
    Product: string
    Version: string
    Update: string
    Edition: string
    Language: string
}
export interface FingerprintRule {
    Id: number
    RuleName: string
    CPE: CPE
    WebPath: string
    ExtInfo: string
    MatchExpression: string
    GroupName: string[]
}
export interface QueryFingerprintResponse {
    Data: FingerprintRule[]
    Pagination: Paging
    Total: number
}
/** @name 获取本地指纹列表数据 */
export const grpcFetchLocalFingerprintList: APIFunc<QueryFingerprintRequest, QueryFingerprintResponse> = (request) => {
    return new Promise(async (resolve, reject) => {
        ipcRenderer
            .invoke("QueryFingerprint", request)
            .then(resolve)
            .catch((e) => {
                yakitNotify("error", "查询本地指纹列表数据失败：" + e)
                reject(e)
            })
    })
}

interface DeleteFingerprintRequest {
    Filter: FingerprintFilter
    Pagination?: Paging
}
/** @name 删除本地指纹列表数据 */
export const grpcDeleteFingerprint: APIFunc<DeleteFingerprintRequest, DbOperateMessage> = (request) => {
    return new Promise(async (resolve, reject) => {
        ipcRenderer
            .invoke("DeleteFingerprint", request)
            .then(resolve)
            .catch((e) => {
                yakitNotify("error", "删除本地指纹列表数据失败：" + e)
                reject(e)
            })
    })
}

interface UpdateFingerprintRequest {
    Id: number
    Rule: FingerprintRule
}
/** @name 更新本地指纹 */
export const grpcUpdateFingerprint: APIFunc<UpdateFingerprintRequest, DbOperateMessage> = (request) => {
    return new Promise(async (resolve, reject) => {
        ipcRenderer
            .invoke("UpdateFingerprint", request)
            .then(resolve)
            .catch((e) => {
                yakitNotify("error", "更新本地指纹列表数据失败：" + e)
                reject(e)
            })
    })
}

interface CreateFingerprintRequest {
    Rule: {
        RuleName: string
        MatchExpression: string
        GroupName: string[]
    }
}
/** @name 创建本地指纹 */
export const grpcCreateFingerprint: APIFunc<CreateFingerprintRequest, DbOperateMessage> = (request) => {
    return new Promise(async (resolve, reject) => {
        ipcRenderer
            .invoke("CreateFingerprint", request)
            .then(resolve)
            .catch((e) => {
                yakitNotify("error", "创建本地指纹列表数据失败：" + e)
                reject(e)
            })
    })
}

interface QueryFingerprintSameGroupRequest {
    Filter: FingerprintFilter
}
interface QueryFingerprintSameGroupResponse {
    Group: FingerprintGroup[]
}
/** @name 查询指纹集合的所属组交集 */
export const grpcFetchFingerprintForSameGroup: APIFunc<
    QueryFingerprintSameGroupRequest,
    QueryFingerprintSameGroupResponse
> = (request) => {
    return new Promise(async (resolve, reject) => {
        ipcRenderer
            .invoke("QuerySyntaxFlowSameGroup", request)
            .then(resolve)
            .catch((e) => {
                yakitNotify("error", "查询指纹所属于组交集失败：" + e)
                reject(e)
            })
    })
}

export interface UpdateFingerprintAndGroupRequest {
    Filter: FingerprintFilter
    AddGroups: string[]
    RemoveGroups: string[]
}
/** @name 更新指纹里的本地组 */
export const grpcUpdateFingerprintToGroup: APIFunc<UpdateFingerprintAndGroupRequest, unknown> = (request) => {
    return new Promise(async (resolve, reject) => {
        ipcRenderer
            .invoke("UpdateSyntaxFlowRuleAndGroup", request)
            .then(resolve)
            .catch((e) => {
                yakitNotify("error", "更新组失败：" + e)
                reject(e)
            })
    })
}

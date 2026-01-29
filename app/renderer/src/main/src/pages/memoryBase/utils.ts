import {APIFunc} from "@/apiUtils/type"
import {
    AIMemoryEntity,
    AIMemorySearchParams,
    CountAIMemoryEntityTagsRequest,
    CountAIMemoryEntityTagsResponse,
    CreateAIMemoryEntityRequest,
    DeleteAIMemoryEntityRequest,
    FloatRange,
    MemorySelectQuery,
    QueryAIMemoryEntityRequest,
    QueryAIMemoryEntityResponse
} from "./type"
import {yakitNotify} from "@/utils/notification"
import {DbOperateMessage} from "../layout/mainOperatorContent/utils"
const {ipcRenderer} = window.require("electron")

/**@name 创建AI记忆库数据 */
export const grpcCreateAIMemoryEntity: APIFunc<CreateAIMemoryEntityRequest, null> = (params, hiddenError) => {
    return new Promise(async (resolve, reject) => {
        ipcRenderer
            .invoke("CreateAIMemoryEntity", params)
            .then(resolve)
            .catch((e) => {
                if (!hiddenError) yakitNotify("error", "grpcCreateAIMemoryEntity 失败:" + e)
                reject(e)
            })
    })
}

/**@name 删除AI记忆库数据 */
export const grpcDeleteAIMemoryEntity: APIFunc<DeleteAIMemoryEntityRequest, DbOperateMessage> = (
    params,
    hiddenError
) => {
    return new Promise(async (resolve, reject) => {
        ipcRenderer
            .invoke("DeleteAIMemoryEntity", params)
            .then(resolve)
            .catch((e) => {
                if (!hiddenError) yakitNotify("error", "grpcDeleteAIMemoryEntity 失败:" + e)
                reject(e)
            })
    })
}

/**@name 更新AI记忆库数据 */
export const grpcUpdateAIMemoryEntity: APIFunc<AIMemoryEntity, DbOperateMessage> = (params, hiddenError) => {
    return new Promise(async (resolve, reject) => {
        ipcRenderer
            .invoke("UpdateAIMemoryEntity", params)
            .then(resolve)
            .catch((e) => {
                if (!hiddenError) yakitNotify("error", "grpcUpdateAIMemoryEntity 失败:" + e)
                reject(e)
            })
    })
}
/** @description 目前没有分库,所有都是用默认的 */
const DEFAULT_SESSION_ID = "default"
export const getAIMemoryEntityFilter = (params: {
    query: MemorySelectQuery
    search: AIMemorySearchParams
}): QueryAIMemoryEntityRequest["Filter"] => {
    const {query, search} = params
    const filter: QueryAIMemoryEntityRequest["Filter"] = {
        TagMatchAll: false,
        CScore: undefined,
        OScore: undefined,
        RScore: undefined,
        EScore: undefined,
        PScore: undefined,
        AScore: undefined,
        TScore: undefined,
        Tags: undefined,
        ContentKeyword: "",
        SemanticQuery: "",
        SessionID: ""
    }
    if (query.tags && query.tags.length > 0) {
        filter.Tags = query.tags.map((tag) => tag.Value)
    }
    if (query.rate && query.rate.length > 0) {
        const rateFilter: {[key: string]: FloatRange} = {}
        query.rate.forEach((rateItem) => {
            rateFilter[rateItem.keyName] = {
                Enabled: true,
                Min: rateItem.min,
                Max: rateItem.max
            }
        })
        Object.assign(filter, rateFilter)
    }
    if (!!search && search.type) {
        switch (search.type) {
            case "keyword":
                filter.ContentKeyword = search.keyword || ""
                break
            case "ai":
                filter.SemanticQuery = search.aiInput || ""
                filter.SessionID = DEFAULT_SESSION_ID
                break
            default:
                break
        }
    }
    return filter
}
/**@name 获取AI记忆库数据 */
export const grpcQueryAIMemoryEntity: APIFunc<QueryAIMemoryEntityRequest, QueryAIMemoryEntityResponse> = (
    params,
    hiddenError
) => {
    return new Promise(async (resolve, reject) => {
        ipcRenderer
            .invoke("QueryAIMemoryEntity", params)
            .then(resolve)
            .catch((e) => {
                if (!hiddenError) yakitNotify("error", "grpcQueryAIMemoryEntity 失败:" + e)
                reject(e)
            })
    })
}

/**
 * @name 获取 AI-Memory tag统计
 */
export const grpcCountAIMemoryEntityTags: APIFunc<CountAIMemoryEntityTagsRequest, CountAIMemoryEntityTagsResponse> = (
    params,
    hiddenError
) => {
    return new Promise(async (resolve, reject) => {
        ipcRenderer
            .invoke("CountAIMemoryEntityTags", {
                ...params,
                SessionID: DEFAULT_SESSION_ID
            })
            .then(resolve)
            .catch((e) => {
                if (!hiddenError) yakitNotify("error", "grpcCountAIMemoryEntityTags 失败:" + e)
                reject(e)
            })
    })
}

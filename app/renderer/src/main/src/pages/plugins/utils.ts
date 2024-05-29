import {PluginFilterParams, PluginListPageMeta, PluginSearchParams} from "./baseTemplateType"
import {YakitPluginListOnlineResponse} from "./online/PluginsOnlineType"
import {NetWorkApi, requestConfig} from "@/services/fetch"
import {API} from "@/services/swagger/resposeType"
import {info, yakitNotify} from "@/utils/notification"
import {isCommunityEdition} from "@/utils/envfile"
import {compareAsc} from "../yakitStore/viewers/base"
import {
    GetYakScriptGroupResponse,
    GetYakScriptTagsAndTypeResponse,
    GroupCount,
    QueryYakScriptGroupResponse,
    QueryYakScriptRequest,
    QueryYakScriptsResponse,
    ResetYakScriptGroupRequest,
    SaveYakScriptGroupRequest,
    YakScript,
    genDefaultPagination
} from "../invoker/schema"
import emiter from "@/utils/eventBus/eventBus"
import {toolDelInvalidKV} from "@/utils/tool"
import {defaultFilter, defaultSearch, pluginTypeToName} from "./builtInData"
import {YakitRoute} from "@/enums/yakitRoute"
import {KVPair} from "../httpRequestBuilder/HTTPRequestBuilder"
import {HTTPRequestBuilderParams} from "@/models/HTTPRequestBuilder"
import {
    HybridScanControlAfterRequest,
    HybridScanControlRequest,
    HybridScanModeType,
    HybridScanPluginConfig
} from "@/models/HybridScan"
import cloneDeep from "lodash/cloneDeep"
import {PluginGroupList} from "./local/PluginsLocalType"
import {HTTPRequestParameters} from "@/types/http-api"
import {defPluginBatchExecuteExtraFormValue} from "@/defaultConstants/PluginBatchExecutor"

const {ipcRenderer} = window.require("electron")

/**
 * 本地插件、插件商店、插件管理页面
 * 当filters过滤条件被其他页面或者意外删掉，插件列表却带了该过滤条件的情况，切换到该页面时需要把被删掉的过滤条件排除
 * @param oldfilters 页面上此时的鼓过滤条件
 * @param newfilters 接口获取的最新过滤条件
 * @returns realFilter - 页面上此时真正的过滤条件 updateFilterFlag - 是否需要更新页面的filters
 */
export interface ExcludeNoExistfilter {
    realFilter: PluginFilterParams
    updateFilterFlag: boolean
}
export const excludeNoExistfilter = (
    oldfilters: PluginFilterParams,
    newfilters: PluginGroupList[]
): ExcludeNoExistfilter => {
    let updateFilterFlag = false
    let realFilter: PluginFilterParams = structuredClone(oldfilters)
    Object.keys(oldfilters).forEach((key) => {
        oldfilters[key].forEach((item: API.PluginsSearchData) => {
            const value = item.value
            newfilters.forEach((item2) => {
                if (item2.groupKey === key) {
                    updateFilterFlag = item2.data.findIndex((item3) => item3.value === value) === -1
                    if (updateFilterFlag) {
                        realFilter = {
                            ...realFilter,
                            [key]: realFilter[key].filter((item4: API.PluginsSearchData) => item4.value !== value)
                        }
                    }
                }
            })
        })
    })
    return {realFilter, updateFilterFlag}
}

/**
 * @name http接口公共参数转换(前端数据转接口参数)
 * @description 适用api接口请求参数是否继承 API.PluginsWhere
 */
export const convertPluginsRequestParams = (
    filter: PluginFilterParams,
    search: PluginSearchParams,
    pageParams?: PluginListPageMeta
): PluginsQueryProps => {
    const data: PluginsQueryProps = {
        page: pageParams?.page || 1,
        limit: pageParams?.limit || 20,
        order: pageParams?.order || "desc",
        order_by: pageParams?.order_by || "",
        // search
        keywords: search.type === "keyword" ? search.keyword : "",
        user_name: search.type === "userName" ? search.userName : "",

        // filter
        plugin_type: filter.plugin_type?.map((ele) => ele.value),
        status: filter.status?.map((ele) => Number(ele.value)) || [],
        tags: filter.tags?.map((ele) => ele.value) || [],
        is_private: filter.plugin_private?.map((ele) => ele.value === "true") || [],
        pluginGroup: {unSetGroup: false, group: filter.plugin_group?.map((ele) => ele.value) || []}
    }
    return toolDelInvalidKV(data)
}

/**插件商店这边需要token */
function PluginNetWorkApi<T extends {token?: string}, D>(params: requestConfig<T>): Promise<D> {
    return new Promise(async (resolve, reject) => {
        try {
            const userInfo = await ipcRenderer.invoke("get-login-user-info", {})
            if (params.data && userInfo.isLogin) {
                params.data.token = userInfo.token
            }
        } catch (error) {}

        try {
            resolve(await NetWorkApi(params))
        } catch (error) {
            reject(error)
        }
    })
}
/**
 * @description  /plugins 接口请求的定义
 */
export interface PluginsQueryProps extends API.PluginsWhereListRequest, PluginListPageMeta {}
/**线上插件基础接口 */
const apiFetchList: (query: PluginsQueryProps) => Promise<YakitPluginListOnlineResponse> = (query) => {
    return new Promise((resolve, reject) => {
        try {
            PluginNetWorkApi<PluginsQueryProps, YakitPluginListOnlineResponse>({
                method: "get",
                url: "plugins",
                params: {
                    page: query.page,
                    limit: query.limit,
                    order: query.order || "desc",
                    order_by: query.order_by
                },
                data: {...query}
            })
                .then((res: YakitPluginListOnlineResponse) => {
                    resolve({
                        ...res,
                        data: res.data || []
                    })
                })
                .catch((err) => {
                    reject(err)
                })
        } catch (error) {
            reject(error)
        }
    })
}
/**获取插件商店列表 */
export const apiFetchOnlineList: (query: PluginsQueryProps) => Promise<YakitPluginListOnlineResponse> = (query) => {
    return new Promise((resolve, reject) => {
        try {
            const newQuery = {
                ...query,
                listType: ""
            }
            apiFetchList(newQuery)
                .then((res: YakitPluginListOnlineResponse) => {
                    resolve(res)
                })
                .catch((err) => {
                    if (err !== "token过期") {
                        yakitNotify("error", "获取插件商店列表失败:" + err)
                    }
                    reject(err)
                })
        } catch (error) {
            if (error !== "token过期") {
                yakitNotify("error", "获取插件商店列表失败:" + error)
            }
            reject(error)
        }
    })
}

/**获取我的插件列表 */
export const apiFetchMineList: (query: PluginsQueryProps) => Promise<YakitPluginListOnlineResponse> = (query) => {
    return new Promise((resolve, reject) => {
        try {
            const newQuery = {
                ...query,
                order_by: query.order_by || "updated_at",
                listType: "mine"
            }
            apiFetchList(newQuery)
                .then((res: YakitPluginListOnlineResponse) => {
                    resolve(res)
                })
                .catch((err) => {
                    yakitNotify("error", "获取我的插件列表失败:" + err)
                    reject(err)
                })
        } catch (error) {
            yakitNotify("error", "获取我的插件列表失败:" + error)
            reject(error)
        }
    })
}

/**获取插件回收站列表 */
export const apiFetchRecycleList: (query: PluginsQueryProps) => Promise<YakitPluginListOnlineResponse> = (query) => {
    return new Promise((resolve, reject) => {
        try {
            const newQuery = {
                ...query,
                order_by: query.order_by || "updated_at",
                listType: "recycle"
            }
            apiFetchList(newQuery)
                .then((res: YakitPluginListOnlineResponse) => {
                    resolve(res)
                })
                .catch((err) => {
                    yakitNotify("error", "获取回收站列表失败:" + err)
                    reject(err)
                })
        } catch (error) {
            yakitNotify("error", "获取回收站列表失败:" + error)
            reject(error)
        }
    })
}

/**获取插件审核页面列表 */
export const apiFetchCheckList: (query: PluginsQueryProps) => Promise<YakitPluginListOnlineResponse> = (query) => {
    return new Promise((resolve, reject) => {
        try {
            const newQuery = {
                ...query,
                order_by: query.order_by || "updated_at",
                listType: "check"
            }
            apiFetchList(newQuery)
                .then((res: YakitPluginListOnlineResponse) => {
                    resolve(res)
                })
                .catch((err) => {
                    yakitNotify("error", "获取插件审核列表失败:" + err)
                    reject(err)
                })
        } catch (error) {
            yakitNotify("error", "获取插件审核列表失败:" + error)
            reject(error)
        }
    })
}

/**线上插件左侧统计接口基础版 */
export const apiFetchGroupStatistics: (query?: API.PluginsSearchRequest) => Promise<API.PluginsSearchResponse> = (
    query
) => {
    return new Promise((resolve, reject) => {
        try {
            PluginNetWorkApi<API.PluginsSearchRequest, API.PluginsSearchResponse>({
                method: "post",
                url: "plugins/search",
                data: {...query}
            })
                .then((res: API.PluginsSearchResponse) => {
                    const data: API.PluginsSearch[] = res.data
                        .filter((ele) => (ele.data || []).length > 0)
                        .sort((a, b) => compareAsc(a, b, "sort"))
                    resolve({...res, data})
                })
                .catch((err) => {
                    reject(err)
                })
        } catch (error) {
            reject(error)
        }
    })
}

/**插件商店左侧统计 */
export const apiFetchGroupStatisticsOnline: (query?: API.PluginsSearchRequest) => Promise<API.PluginsSearchResponse> = (
    query
) => {
    return new Promise((resolve, reject) => {
        try {
            const newQuery = {
                ...query,
                listType: ""
            }
            apiFetchGroupStatistics(newQuery)
                .then((res: API.PluginsSearchResponse) => {
                    resolve(res)
                })
                .catch((err) => {
                    if (err !== "token过期") {
                        yakitNotify("error", "获取插件商店统计数据失败:" + err)
                    }
                    reject(err)
                })
        } catch (error) {
            if (error !== "token过期") {
                yakitNotify("error", "获取插件商店统计数据失败:" + error)
            }
            reject(error)
        }
    })
}

/**我的插件左侧统计 */
export const apiFetchGroupStatisticsMine: (query?: API.PluginsSearchRequest) => Promise<API.PluginsSearchResponse> = (
    query
) => {
    return new Promise((resolve, reject) => {
        try {
            const newQuery = {
                ...query,
                listType: "mine"
            }
            apiFetchGroupStatistics(newQuery)
                .then((res: API.PluginsSearchResponse) => {
                    resolve(res)
                })
                .catch((err) => {
                    yakitNotify("error", "获取我的插件统计数据失败:" + err)
                    reject(err)
                })
        } catch (error) {
            yakitNotify("error", "获取我的插件统计数据失败:" + error)
            reject(error)
        }
    })
}

/**插件审核 插件管理 左侧统计 */
export const apiFetchGroupStatisticsCheck: (query?: API.PluginsSearchRequest) => Promise<API.PluginsSearchResponse> = (
    query
) => {
    return new Promise((resolve, reject) => {
        try {
            const newQuery = {
                ...query,
                listType: "check"
            }
            apiFetchGroupStatistics(newQuery)
                .then((res: API.PluginsSearchResponse) => {
                    // 插件类型、Tag、审核状态 插件分组
                    const newData = res.data || []
                    resolve({
                        ...res,
                        data: newData
                    })
                })
                .catch((err) => {
                    yakitNotify("error", "获取插件审核统计数据失败:" + err)
                    reject(err)
                })
        } catch (error) {
            yakitNotify("error", "获取插件审核统计数据失败:" + error)
            reject(error)
        }
    })
}

/**
 * @description 接口/yakit/plugin/stars 请求参数
 */
export interface PluginStarsRequest {
    uuid: string
    operation: "remove" | "add"
}
/**线上插件点赞 */
export const apiPluginStars: (query: PluginStarsRequest) => Promise<API.ActionSucceeded> = (query) => {
    return new Promise(async (resolve, reject) => {
        try {
            NetWorkApi<PluginStarsRequest, API.ActionSucceeded>({
                method: "post",
                url: "plugins/stars",
                params: {...query}
            })
                .then((res: API.ActionSucceeded) => {
                    resolve(res)
                })
                .catch((err) => {
                    yakitNotify("error", "点赞失败:" + err)
                    reject(err)
                })
        } catch (error) {
            yakitNotify("error", "点赞失败:" + error)
            reject(error)
        }
    })
}

/** grpc接口 批量下载插件 */
export interface DownloadOnlinePluginsRequest {
    Token?: string
    IsPrivate?: boolean[]
    Keywords?: string
    PluginType?: string[]
    Tags?: string[]
    UserName?: string
    UserId?: string
    TimeSearch?: string
    Group?: string[]
    ListType?: string
    Status?: number[]
    UUID?: string[]
    ScriptName?: string[]
}
// 开发参数 转换为 DownloadOnlinePluginBatch接口类型
export const convertDownloadOnlinePluginBatchRequestParams = (
    filter: PluginFilterParams,
    search: PluginSearchParams
): DownloadOnlinePluginsRequest => {
    const data: DownloadOnlinePluginsRequest = {
        // search
        Keywords: search.type === "keyword" ? search.keyword : "",
        UserName: search.type === "userName" ? search.userName : "",

        // filter
        PluginType: filter.plugin_type?.map((ele) => ele.value),
        Status: filter.status?.map((ele) => Number(ele.value)) || [],
        Tags: filter.tags?.map((ele) => ele.value) || [],
        IsPrivate: filter.plugin_private?.map((ele) => ele.value === "true") || [],
        Group: filter.plugin_group?.map((ele) => ele.value) || []
    }
    return toolDelInvalidKV(data)
}

/**下载插件 非进度条版本 */
export const apiDownloadPluginBase: (query?: DownloadOnlinePluginsRequest) => Promise<null> = (query) => {
    return new Promise((resolve, reject) => {
        ipcRenderer
            .invoke("DownloadOnlinePluginBatch", query)
            .then((res) => {
                if (isCommunityEdition()) ipcRenderer.invoke("refresh-public-menu")
                else ipcRenderer.invoke("change-main-menu")
                // 插件商店、我的插件、插件管理页面 下载插件后需要更新 本地插件列表
                emiter.emit("onRefLocalPluginList", "")
                resolve(res)
            })
            .catch((e) => {
                reject(e)
            })
    })
}

/** 插件商店 下载插件 */
export const apiDownloadPluginOnline: (query?: DownloadOnlinePluginsRequest) => Promise<null> = (query) => {
    return new Promise((resolve, reject) => {
        try {
            const newQuery = {
                ...(query || {}),
                ListType: ""
            }
            apiDownloadPluginBase(newQuery)
                .then((res) => {
                    yakitNotify("success", "下载成功")
                    resolve(res)
                })
                .catch((err) => {
                    yakitNotify("error", "插件商店下载插件失败:" + err)
                    reject(err)
                })
        } catch (error) {
            yakitNotify("error", "插件商店下载插件失败:" + error)
            reject(error)
        }
    })
}

/** 我的插件 下载插件 */
export const apiDownloadPluginMine: (query?: DownloadOnlinePluginsRequest) => Promise<null> = (query) => {
    return new Promise((resolve, reject) => {
        try {
            const newQuery = {
                ...(query || {}),
                ListType: "mine"
            }
            apiDownloadPluginBase(newQuery)
                .then((res) => {
                    yakitNotify("success", "下载成功")
                    resolve(res)
                })
                .catch((err) => {
                    yakitNotify("error", "下载我的插件失败:" + err)
                    reject(err)
                })
        } catch (error) {
            yakitNotify("error", "下载我的插件失败:" + error)
            reject(error)
        }
    })
}

/** 插件管理 下载插件 */
export const apiDownloadPluginCheck: (query?: DownloadOnlinePluginsRequest) => Promise<null> = (query) => {
    return new Promise((resolve, reject) => {
        try {
            const newQuery = {
                ...(query || {}),
                ListType: "check"
            }
            apiDownloadPluginBase(newQuery)
                .then((res) => resolve(res))
                .catch((err) => {
                    yakitNotify("error", "插件管理插件失败:" + err)
                    reject(err)
                })
        } catch (error) {
            yakitNotify("error", "插件管理插件失败:" + error)
            reject(error)
        }
    })
}

/** 其他情况，不区分私密公开 下载插件 */
export const apiDownloadPluginOther: (query?: DownloadOnlinePluginsRequest) => Promise<null> = (query) => {
    return new Promise((resolve, reject) => {
        const newQuery = {
            ...(query || {}),
            ListType: "other"
        }
        apiDownloadPluginBase(newQuery)
            .then(resolve)
            .catch((err) => {
                yakitNotify("error", "插件导入/下载失败:" + err)
                reject(err)
            })
    })
}

/**线上删除插件接口基础版  删除（放到回收站） */
const apiDeletePlugin: (query?: API.PluginsWhereDeleteRequest) => Promise<API.ActionSucceeded> = (query) => {
    return new Promise((resolve, reject) => {
        try {
            NetWorkApi<API.PluginsWhereDeleteRequest, API.ActionSucceeded>({
                method: "delete",
                url: "plugins",
                data: {...query}
            })
                .then((res: API.ActionSucceeded) => {
                    resolve(res)
                })
                .catch((err) => {
                    reject(err)
                })
        } catch (error) {
            reject(error)
        }
    })
}

/**我的插件 删除插件接口 删除（放到回收站）*/
export const apiDeletePluginMine: (query?: API.PluginsWhereDeleteRequest) => Promise<API.ActionSucceeded> = (query) => {
    return new Promise((resolve, reject) => {
        try {
            const newQuery = {
                ...query,
                listType: "mine"
            }
            apiDeletePlugin(newQuery)
                .then((res: API.ActionSucceeded) => {
                    resolve(res)
                })
                .catch((err) => {
                    yakitNotify("error", "删除我的插件失败：" + err)
                    reject(err)
                })
        } catch (error) {
            yakitNotify("error", "删除我的插件失败：" + error)
            reject(error)
        }
    })
}

/**插件审核 删除插件接口 删除（放到回收站）*/
export const apiDeletePluginCheck: (query?: API.PluginsWhereDeleteRequest) => Promise<API.ActionSucceeded> = (
    query
) => {
    return new Promise((resolve, reject) => {
        try {
            const newQuery = {
                ...query,
                listType: "check"
            }
            apiDeletePlugin(newQuery)
                .then((res: API.ActionSucceeded) => {
                    resolve(res)
                })
                .catch((err) => {
                    yakitNotify("error", "删除插件失败：" + err)
                    reject(err)
                })
        } catch (error) {
            yakitNotify("error", "删除插件失败：" + error)
            reject(error)
        }
    })
}

/**我的插件 修改私密公开 */
export const apiUpdatePluginPrivateMine: (query: API.UpPluginsPrivateRequest) => Promise<API.ActionSucceeded> = (
    query
) => {
    return new Promise((resolve, reject) => {
        try {
            NetWorkApi<API.UpPluginsPrivateRequest, API.ActionSucceeded>({
                method: "post",
                url: "up/plugins/private",
                data: {...query}
            })
                .then((res: API.ActionSucceeded) => {
                    yakitNotify("success", "公开/私密修改成功")
                    resolve(res)
                })
                .catch((err) => {
                    yakitNotify("error", "公开/私密修改失败：" + err)
                    reject(err)
                })
        } catch (error) {
            yakitNotify("error", "公开/私密修改失败：" + error)
            reject(error)
        }
    })
}
/**彻底删除和还原得接口请求定义 */
export interface PluginsRecycleRequest extends Omit<API.PluginsWhere, "listType"> {
    uuid?: API.PluginsRecycle["uuid"]
}
/**彻底删除 只有回收站有 */
export const apiRemoveRecyclePlugin: (query?: PluginsRecycleRequest) => Promise<API.ActionSucceeded> = (query) => {
    return new Promise((resolve, reject) => {
        try {
            NetWorkApi<API.PluginsRecycleRequest, API.ActionSucceeded>({
                method: "post",
                url: "plugins/recycle",
                data: {...query, listType: "recycle", dumpType: "true"}
            })
                .then((res: API.ActionSucceeded) => {
                    resolve(res)
                })
                .catch((err) => {
                    yakitNotify("error", "彻底删除插件失败：" + err)
                    reject(err)
                })
        } catch (error) {
            yakitNotify("error", "彻底删除插件失败：" + error)
            reject(error)
        }
    })
}

/**还原 只有回收站有 */
export const apiReductionRecyclePlugin: (query?: PluginsRecycleRequest) => Promise<API.ActionSucceeded> = (query) => {
    return new Promise((resolve, reject) => {
        try {
            NetWorkApi<API.PluginsRecycleRequest, API.ActionSucceeded>({
                method: "post",
                url: "plugins/recycle",
                data: {...query, listType: "recycle", dumpType: "false"}
            })
                .then((res: API.ActionSucceeded) => {
                    resolve(res)
                })
                .catch((err) => {
                    yakitNotify("error", "还原插件失败：" + err)
                    reject(err)
                })
        } catch (error) {
            yakitNotify("error", "还原插件失败：" + error)
            reject(error)
        }
    })
}

/**
 * @name QueryYakScript接口参数转换(前端数据转接口参数)
 */
export const convertLocalPluginsRequestParams = (query: {
    filter: PluginFilterParams
    search: PluginSearchParams
    pageParams?: PluginListPageMeta
    defaultFilters?: PluginFilterParams
}): QueryYakScriptRequest => {
    const {filter, search, pageParams, defaultFilters} = query

    const type =
        filter.plugin_type && filter.plugin_type?.length > 0 ? filter.plugin_type : defaultFilters?.plugin_type || []
    const tag = filter.tags && filter.tags.length > 0 ? filter.tags : defaultFilters?.tags || []
    const group =
        filter.plugin_group && filter.plugin_group.length > 0 ? filter.plugin_group : defaultFilters?.plugin_group || []

    const data: QueryYakScriptRequest = {
        Pagination: {
            Limit: pageParams?.limit || 10,
            Page: pageParams?.page || 1,
            OrderBy: "updated_at",
            Order: "desc"
        },
        // search
        Keyword: search.type === "keyword" ? search.keyword : "",
        UserName: search.type === "userName" ? search.userName : "",

        // filter
        Type: (type.map((ele) => ele.value) || []).join(","),
        Tag: tag.map((ele) => ele.value) || [],
        Group: {
            UnSetGroup: false,
            Group: group?.map((ele) => ele.value) || []
        }
    }
    return toolDelInvalidKV(data)
}
/**本地，获取插件 QueryYakScript 接口基础版 */
export const apiQueryYakScriptBase: (query?: QueryYakScriptRequest) => Promise<QueryYakScriptsResponse> = (query) => {
    return new Promise((resolve, reject) => {
        try {
            ipcRenderer
                .invoke("QueryYakScript", query)
                .then((item: QueryYakScriptsResponse) => {
                    resolve(item)
                })
                .catch((e: any) => {
                    reject(e)
                })
        } catch (error) {
            reject(error)
        }
    })
}
/**本地，获取插件列表 */
export const apiQueryYakScript: (query?: QueryYakScriptRequest) => Promise<QueryYakScriptsResponse> = (query) => {
    return new Promise((resolve, reject) => {
        try {
            apiQueryYakScriptBase(query)
                .then(resolve)
                .catch((e: any) => {
                    yakitNotify("error", "获取本地插件失败:" + e)
                    reject(e)
                })
        } catch (error) {
            yakitNotify("error", "获取本地插件失败:" + error)
            reject(error)
        }
    })
}
/**本地，获取插件总数 */
export const apiQueryYakScriptTotal: () => Promise<QueryYakScriptsResponse> = () => {
    return new Promise((resolve, reject) => {
        try {
            const query: QueryYakScriptRequest = {
                Pagination: {
                    Page: 1,
                    Limit: 1,
                    Order: "",
                    OrderBy: ""
                }
            }
            apiQueryYakScriptBase(query)
                .then((item: QueryYakScriptsResponse) => {
                    resolve(item)
                })
                .catch((e: any) => {
                    yakitNotify("error", "获取本地插件总数失败:" + e)
                    reject(e)
                })
        } catch (error) {
            yakitNotify("error", "获取本地插件总数失败:" + error)
            reject(error)
        }
    })
}
/**本地插件列表分组 */
export const apiFetchGroupStatisticsLocal: () => Promise<API.PluginsSearchResponse> = () => {
    return new Promise((resolve, reject) => {
        try {
            ipcRenderer
                .invoke("GetYakScriptTagsAndType", {})
                .then((res: GetYakScriptTagsAndTypeResponse) => {
                    const data = [
                        {
                            groupKey: "plugin_type",
                            groupName: "插件类型",
                            sort: 1,
                            data: (res["Type"] || []).map((ele) => ({
                                label: pluginTypeToName[ele.Value]?.name || ele.Value,
                                value: ele.Value,
                                count: ele.Total
                            }))
                        },
                        {
                            groupKey: "plugin_group",
                            groupName: "插件组",
                            sort: 2,
                            data: (res["Group"] || []).map((ele) => ({
                                label: ele.Value,
                                value: ele.Value,
                                count: ele.Total
                            }))
                        },
                        {
                            groupKey: "tags",
                            groupName: "Tag",
                            sort: 3,
                            data: (res["Tag"] || []).map((ele) => ({
                                label: ele.Value,
                                value: ele.Value,
                                count: ele.Total
                            }))
                        }
                    ].filter((ele) => {
                        if (ele.groupKey === "plugin_group") {
                            return true
                        } else {
                            return ele.data.length > 0
                        }
                    })
                    resolve({data})
                })
                .catch((e) => {
                    yakitNotify("error", `获取本地插件统计数据展示错误:${e}`)
                })
        } catch (error) {
            yakitNotify("error", "获取本地插件统计数据展示错误:" + error)
            reject(error)
        }
    })
}
/** apiDeleteYakScriptByIds 请求参数 */
export interface DeleteYakScriptRequestByIdsProps {
    Ids: number[]
}
/**本地，批量删除插件 */
export const apiDeleteYakScriptByIds: (query: DeleteYakScriptRequestByIdsProps) => Promise<null> = (query) => {
    return new Promise((resolve, reject) => {
        try {
            const newQuery: DeleteYakScriptRequestByIdsProps = {
                Ids: query.Ids.map((ele) => Number(ele)) || []
            }
            ipcRenderer
                .invoke("DeleteLocalPluginsByWhere", newQuery)
                .then(() => {
                    if (isCommunityEdition()) ipcRenderer.invoke("refresh-public-menu")
                    else ipcRenderer.invoke("change-main-menu")
                    resolve(null)
                })
                .catch((e: any) => {
                    yakitNotify("error", "批量删除本地插件失败:" + e)
                    reject(e)
                })
        } catch (error) {
            yakitNotify("error", "批量删除本地插件失败:" + error)
            reject(error)
        }
    })
}

export const defaultDeleteLocalPluginsByWhereRequest: DeleteLocalPluginsByWhereRequestProps = {
    Keywords: "",
    Type: "",
    UserName: "",
    Tags: "",
    Groups: []
}
/** grpc接口 DeleteLocalPluginsByWhere 请求参数 */
export interface DeleteLocalPluginsByWhereRequestProps {
    Keywords: string
    Type: string
    UserName: string
    Tags: string
    Groups: string[]
}
/**
 * @name DeleteLocalPluginsByWhere 接口参数转换(前端数据转接口参数)
 */
export const convertDeleteLocalPluginsByWhereRequestParams = (
    filter: PluginFilterParams,
    search: PluginSearchParams
): DeleteLocalPluginsByWhereRequestProps => {
    const data: DeleteLocalPluginsByWhereRequestProps = {
        // search
        Keywords: search.type === "keyword" ? search.keyword : "",
        UserName: search.type === "userName" ? search.userName : "",

        // filter
        Type: (filter.plugin_type?.map((ele) => ele.value) || []).join(","),
        Tags: (filter.tags?.map((ele) => ele.value) || []).join(","),
        Groups: filter.plugin_group?.map((ele) => ele.value) || []
    }
    return toolDelInvalidKV(data)
}
/**本地，带条件的全部删除 */
export const apiDeleteLocalPluginsByWhere: (query: DeleteLocalPluginsByWhereRequestProps) => Promise<null> = (
    query
) => {
    return new Promise((resolve, reject) => {
        try {
            ipcRenderer
                .invoke("DeleteLocalPluginsByWhere", query)
                .then(() => {
                    if (isCommunityEdition()) ipcRenderer.invoke("refresh-public-menu")
                    else ipcRenderer.invoke("change-main-menu")
                    resolve(null)
                })
                .catch((e: any) => {
                    yakitNotify("error", "DeleteLocalPluginsByWhere删除本地插件失败:" + e)
                    reject(e)
                })
        } catch (error) {
            yakitNotify("error", "DeleteLocalPluginsByWhere删除本地插件失败:" + error)
            reject(error)
        }
    })
}

/**
 * @name 获取插件的详细信息
 * @description 审核|日志
 */
export const apiFetchPluginDetailCheck: (
    query: API.PluginsAuditDetailRequest
) => Promise<API.PluginsAuditDetailResponse> = (query) => {
    return new Promise((resolve, reject) => {
        try {
            NetWorkApi<API.PluginsAuditDetailRequest, API.PluginsAuditDetailResponse>({
                method: "post",
                url: "plugins/audit/detail",
                data: {...query}
            })
                .then((res) => {
                    resolve(res)
                })
                .catch((err) => {
                    yakitNotify("error", "获取详情失败：" + err)
                    reject(err)
                })
        } catch (error) {
            yakitNotify("error", "获取详情失败：：" + error)
            reject(error)
        }
    })
}

/**
 * @name 审核插件详情(通过|不通过)
 * @description 审核|日志
 */
export const apiAuditPluginDetaiCheck: (query: API.PluginsAuditRequest) => Promise<API.ActionSucceeded> = (query) => {
    return new Promise((resolve, reject) => {
        try {
            NetWorkApi<API.PluginsAuditRequest, API.ActionSucceeded>({
                method: "post",
                url: "plugins/audit",
                data: {...query}
            })
                .then((res) => {
                    resolve(res)
                })
                .catch((err) => {
                    yakitNotify("error", "操作失败：" + err)
                    reject(err)
                })
        } catch (error) {
            yakitNotify("error", "操作失败：" + error)
            reject(error)
        }
    })
}

/**
 * @name 获取指定插件的详情(线上)
 */
export const apiFetchOnlinePluginInfo: (uuid: string, isShowError?: boolean) => Promise<API.PluginsDetail> = (
    uuid,
    isShowError
) => {
    return new Promise(async (resolve, reject) => {
        PluginNetWorkApi<{uuid: string; token?: string}, API.PluginsDetail>({
            method: "post",
            url: "plugins/detail",
            data: {uuid: uuid}
        })
            .then(resolve)
            .catch((err) => {
                if (isShowError !== false) yakitNotify("error", "获取线上插件详情失败:" + err)
                reject(err)
            })
    })
}

export interface PluginLogsRequest extends HTTPRequestParameters, API.LogsRequest {}
/**
 * @name 获取插件的日志
 */
export const apiFetchPluginLogs: (query: {
    uuid: string
    Page: number
    Limit?: number
}) => Promise<API.PluginsLogsResponse> = (query) => {
    return new Promise(async (resolve, reject) => {
        const params: HTTPRequestParameters = {
            page: query.Page,
            limit: query.Limit || 20,
            order_by: "created_at",
            order: "desc"
        }
        const data: API.LogsRequest = {
            uuid: query.uuid
        }
        try {
            const userInfo = await ipcRenderer.invoke("get-login-user-info", {})
            if (userInfo.isLogin) {
                data.token = userInfo.token || undefined
            }
        } catch (error) {}

        try {
            NetWorkApi<PluginLogsRequest, API.PluginsLogsResponse>({
                method: "get",
                url: "plugins/logs",
                params: {...params} as any,
                data: {...data}
            })
                .then(resolve)
                .catch((err) => {
                    yakitNotify("error", "获取日志失败:" + err)
                    reject(err)
                })
        } catch (error) {
            yakitNotify("error", "获取日志失败:" + error)
            reject(error)
        }
    })
}

interface GetYakScriptByOnlineIDRequest {
    UUID: string
}
/**
 * @description 通过线上uuid查询本地插件数据
 */
export const apiGetYakScriptByOnlineID: (query: GetYakScriptByOnlineIDRequest) => Promise<YakScript> = (query) => {
    return new Promise((resolve, reject) => {
        try {
            ipcRenderer
                .invoke("GetYakScriptByOnlineID", {
                    ...query
                } as GetYakScriptByOnlineIDRequest)
                .then((newScript: YakScript) => {
                    resolve(newScript)
                })
                .catch((e) => {
                    yakitNotify("error", "查询本地插件错误:" + e)
                    reject(e)
                })
        } catch (error) {
            yakitNotify("error", "查询本地插件错误:" + error)
            reject(error)
        }
    })
}

/**
 * @description 插件商店/我的插件详情点击去使用，跳转本地详情
 */
export const onlineUseToLocalDetail = (uuid: string, listType: "online" | "mine") => {
    const query: QueryYakScriptRequest = {
        Pagination: {
            Page: 1,
            Limit: 1,
            Order: "",
            OrderBy: ""
        },
        UUID: uuid
    }
    apiQueryYakScript(query).then((res) => {
        if (+res.Total > 0) {
            emiter.emit("openPage", JSON.stringify({route: YakitRoute.Plugin_Local, params: {uuid: uuid}}))
        } else {
            let downloadParams: DownloadOnlinePluginsRequest = {
                UUID: [uuid]
            }
            if (listType === "online") {
                apiDownloadPluginOnline(downloadParams).then(() => {
                    emiter.emit("openPage", JSON.stringify({route: YakitRoute.Plugin_Local, params: {uuid: uuid}}))
                })
            } else if (listType === "mine") {
                apiDownloadPluginMine(downloadParams).then(() => {
                    emiter.emit("openPage", JSON.stringify({route: YakitRoute.Plugin_Local, params: {uuid: uuid}}))
                })
            }
        }
    })
}

interface QueryYakScriptByYakScriptNameRequest {
    pluginName: string
}

/**
 * @description 插件商店/我的插件详情点击去使用，跳转本地详情
 */
export const apiQueryYakScriptByYakScriptName: (query: QueryYakScriptByYakScriptNameRequest) => Promise<YakScript> = (
    query
) => {
    return new Promise((resolve, reject) => {
        try {
            const newQuery: QueryYakScriptRequest = {
                Pagination: {
                    Page: 1,
                    Limit: 1,
                    Order: "",
                    OrderBy: ""
                },
                IncludedScriptNames: [query.pluginName]
            }
            ipcRenderer
                .invoke("QueryYakScript", {
                    ...newQuery
                })
                .then((item: QueryYakScriptsResponse) => {
                    if (item.Data.length > 0) {
                        resolve(item.Data[0])
                    } else {
                        yakitNotify("error", "未查询到该插件")
                        reject("未查询到该插件")
                    }
                })
                .catch((e: any) => {
                    yakitNotify("error", "查询本地插件错误" + e)
                    reject(e)
                })
        } catch (error) {
            yakitNotify("error", "查询本地插件错误" + error)
            reject(error)
        }
    })
}

export interface DebugPluginRequest {
    Code: string
    PluginType: string
    Input: string
    HTTPRequestTemplate: HTTPRequestBuilderParams
    ExecParams: KVPair[]
    /**插件UI联动相关参数*/
    LinkPluginConfig?: HybridScanPluginConfig
    PluginName: string
}
export const defaultLinkPluginConfig = {
    PluginNames: [],
    Filter: undefined
}
/**
 * @description 本地插件详情执行方法
 */
export const apiDebugPlugin: (params: DebugPluginRequest, token: string) => Promise<null> = (params, token) => {
    return new Promise((resolve, reject) => {
        try {
            let executeParams: DebugPluginRequest = {
                ...params
            }
            switch (params.PluginType) {
                case "yak":
                case "lua":
                    executeParams = {
                        ...executeParams,
                        Input: ""
                    }
                    break
                case "codec":
                case "mitm":
                case "port-scan":
                case "nuclei":
                    executeParams = {
                        ...executeParams,
                        ExecParams: []
                    }
                    break
                default:
                    break
            }

            ipcRenderer
                .invoke("DebugPlugin", executeParams, token)
                .then(() => {
                    yakitNotify("info", "启动任务成功")
                    resolve(null)
                })
                .catch((e: any) => {
                    yakitNotify("error", "本地插件执行出错:" + e)
                    reject(e)
                })
        } catch (error) {
            yakitNotify("error", "本地插件执行出错:" + error)
            reject(error)
        }
    })
}

/**
 * @description 取消DebugPlugin
 */
export const apiCancelDebugPlugin: (token: string) => Promise<null> = (token) => {
    return new Promise((resolve, reject) => {
        try {
            ipcRenderer
                .invoke(`cancel-DebugPlugin`, token)
                .then(() => {
                    resolve(null)
                })
                .catch((e: any) => {
                    yakitNotify("error", "取消本地插件执行出错:" + e)
                    reject(e)
                })
        } catch (error) {
            yakitNotify("error", "取消本地插件执行出错:" + error)
            reject(error)
        }
    })
}
interface QueryYakScriptByOnlineGroupRequest {
    Data: YakScript[]
}
/**通过组名获取组内插件 */
export const apiGetPluginByGroup: (OnlineGroup: string[]) => Promise<QueryYakScriptByOnlineGroupRequest> = (
    OnlineGroup
) => {
    return new Promise((resolve, reject) => {
        try {
            ipcRenderer
                .invoke("QueryYakScriptByOnlineGroup", {OnlineGroup})
                .then(resolve)
                .catch((e: any) => {
                    yakitNotify("error", "获取组内插件出错:" + e)
                    reject(e)
                })
        } catch (error) {
            yakitNotify("error", "获取组内插件出错:" + error)
            reject(error)
        }
    })
}

export interface PluginInfoProps {
    selectPluginName: string[]
    search?: PluginSearchParams
    filters?: PluginFilterParams
}
/**
 * @name HybridScan接口参数转换(前端数据转接口参数)
 * @description HybridScan
 */
export const convertHybridScanParams = (
    params: HybridScanRequest,
    pluginInfo: PluginInfoProps
): HybridScanControlAfterRequest => {
    const {
        selectPluginName,
        search = {...cloneDeep(defaultSearch)},
        filters = {...cloneDeep(defaultFilter)}
    } = pluginInfo
    const hTTPRequestTemplate = {
        ...cloneDeep(params.HTTPRequestTemplate)
    }

    delete hTTPRequestTemplate.Concurrent
    delete hTTPRequestTemplate.TotalTimeoutSecond
    delete hTTPRequestTemplate.Proxy
    delete hTTPRequestTemplate.httpFlowId
    delete hTTPRequestTemplate.requestType

    const data: HybridScanControlAfterRequest = {
        Concurrent: params.Concurrent,
        TotalTimeoutSecond: params.TotalTimeoutSecond,
        Proxy: params.Proxy,
        Plugin: {
            PluginNames: selectPluginName,
            Filter:
                selectPluginName.length > 0
                    ? undefined
                    : {
                          //   /* Pagination is ignore for hybrid scan */
                          //   Pagination: genDefaultPagination()
                          ...convertLocalPluginsRequestParams({filter: filters, search})
                      }
        },
        Targets: {
            Input: params.Input,
            InputFile: [],
            HTTPRequestTemplate: hTTPRequestTemplate
        }
    }
    return data
}
export interface PluginBatchExecutorInputValueProps {
    params: HybridScanRequest
    pluginInfo: PluginInfoProps
}
/**
 * @name HybridScan返回的输入参数参数转换为前端所需结构(后端数据转前端参数)
 * @description HybridScan
 */
export const hybridScanParamsConvertToInputValue = (
    value: HybridScanControlAfterRequest
): PluginBatchExecutorInputValueProps => {
    const data: PluginBatchExecutorInputValueProps = {
        params: {
            Input: "",
            HTTPRequestTemplate: {...cloneDeep(defPluginBatchExecuteExtraFormValue)},
            Proxy: "",
            Concurrent: 30,
            TotalTimeoutSecond: 7200
        },
        pluginInfo: {
            selectPluginName: [],
            search: {...cloneDeep(defaultSearch)},
            filters: {...cloneDeep(defaultFilter)}
        }
    }
    try {
        // 只需要 HybridScanControlAfterRequest 部分参数
        const resParams: HybridScanControlAfterRequest = {...value}
        let targets = resParams.Targets
        let plugin = resParams.Plugin
        // 确保 plugin targets 一定会有初始值
        if (!plugin) {
            plugin = {PluginNames: [], Filter: {Pagination: genDefaultPagination()}}
        }
        if (!targets) {
            targets = {
                InputFile: [],
                Input: "",
                HTTPRequestTemplate: {...cloneDeep(defPluginBatchExecuteExtraFormValue)}
            }
        }
        //处理插件的输入值 1.勾选插件 2.全选(搜索条件)
        if ((plugin.PluginNames?.length || 0) > 0) {
            data.pluginInfo.selectPluginName = plugin.PluginNames
        } else {
            const search: PluginSearchParams = {...cloneDeep(defaultSearch)}
            if (plugin.Filter?.Keyword) {
                search.keyword = plugin.Filter?.Keyword
                search.type = "keyword"
            }
            if (plugin.Filter?.UserName) {
                search.userName = plugin.Filter?.UserName
                search.type = "userName"
            }
            data.pluginInfo.search = {...search}
            data.pluginInfo.filters = {
                plugin_group: (plugin.Filter?.Group?.Group || []).map((item) => ({value: item, label: item, count: 0}))
            }
        }
        // 处理输入的参数，包括额外参数
        data.params.Input = targets.Input
        data.params.Proxy = resParams.Proxy || ""
        data.params.Concurrent = resParams.Concurrent || 30
        data.params.TotalTimeoutSecond = resParams.TotalTimeoutSecond || 7200
        data.params.HTTPRequestTemplate = {
            ...cloneDeep(defPluginBatchExecuteExtraFormValue),
            ...targets.HTTPRequestTemplate
        }
    } catch (error) {
        yakitNotify("error", "解析任务输入参数数据和插件勾选数据失败:" + error)
    }
    return data
}
export interface PluginBatchExecutorTaskProps {
    Proxy: string
    Concurrent: number
    TotalTimeoutSecond: number
}
export interface HybridScanRequest extends PluginBatchExecutorTaskProps {
    Input: string
    HTTPRequestTemplate: HTTPRequestBuilderParams
}
/**
 * @description HybridScan 批量执行
 */
export const apiHybridScan: (params: HybridScanControlAfterRequest, token: string) => Promise<null> = (
    params,
    token
) => {
    return new Promise((resolve, reject) => {
        try {
            let executeParams: HybridScanControlAfterRequest = {
                ...params
            }
            ipcRenderer
                .invoke(
                    "HybridScan",
                    {
                        Control: true,
                        HybridScanMode: "new",
                        ResumeTaskId: "",
                        HybridScanTaskSource: !!params.HybridScanTaskSource
                            ? params.HybridScanTaskSource
                            : "pluginBatch"
                    } as HybridScanControlRequest,
                    token
                )
                .then(() => {
                    info(`启动成功,任务ID: ${token}`)
                    // send target / plugin
                    ipcRenderer.invoke("HybridScan", executeParams, token).then(() => {
                        info("发送扫描目标与插件成功")
                    })
                    resolve(null)
                })
        } catch (error) {
            yakitNotify("error", "插件批量执行出错:" + error)
            reject(error)
        }
    })
}
/**
 * @description 取消 HybridScan
 */
export const apiCancelHybridScan: (token: string) => Promise<null> = (token) => {
    return new Promise((resolve, reject) => {
        ipcRenderer
            .invoke(`cancel-HybridScan`, token)
            .then(() => {
                resolve(null)
            })
            .catch((e: any) => {
                yakitNotify("error", "取消插件批量执行出错:" + e)
                reject(e)
            })
    })
}

/**
 * @description HybridScan 批量执行查询/恢复/暂停操作
 */
export const apiHybridScanByMode: (
    runtimeId: string,
    hybridScanMode: HybridScanModeType,
    token: string
) => Promise<null> = (runtimeId, hybridScanMode, token) => {
    return new Promise((resolve, reject) => {
        if (hybridScanMode === "new") return
        const params: HybridScanControlRequest = {
            Control: hybridScanMode !== "pause",
            HybridScanMode: hybridScanMode,
            ResumeTaskId: runtimeId
        }
        ipcRenderer
            .invoke("HybridScan", params, token)
            .then(() => {
                info(`任务ID: ${token}`)
                resolve(null)
            })
            .catch((error) => {
                yakitNotify("error", "插件批量执行出错:" + error)
                reject(error)
            })
    })
}
/**
 * @description 去插件编辑页面
 * @param plugin
 * @returns
 */
export const onToEditPlugin = (plugin: YakScript) => {
    if (plugin.IsCorePlugin) {
        yakitNotify("error", "内置插件无法编辑，建议复制源码新建插件进行编辑。")
        return
    }
    if (plugin.Type === "packet-hack") {
        yakitNotify("error", "该类型已下架，不可编辑")
        return
    }
    if (plugin.Id && +plugin.Id) {
        if (plugin.ScriptName === "综合目录扫描与爆破") {
            yakitNotify("warning", "暂不可编辑")
            return
        }
        emiter.emit(
            "openPage",
            JSON.stringify({
                route: YakitRoute.ModifyYakitScript,
                params: {source: YakitRoute.Plugin_Local, id: +plugin.Id}
            })
        )
    }
}

/**
 * @description 获取插件详情，通过插件id
 */
export const apiGetYakScriptById: (Id: string | number) => Promise<YakScript> = (Id) => {
    return new Promise((resolve, reject) => {
        ipcRenderer.invoke("GetYakScriptById", {Id}).then(resolve).catch(reject)
    })
}

/**本地获取插件组数据 */
export const apiFetchQueryYakScriptGroupLocal: (All?: boolean, ExcludeType?: string[]) => Promise<GroupCount[]> = (
    All = true,
    ExcludeType = ["yak", "codec"]
) => {
    return new Promise((resolve, reject) => {
        ipcRenderer
            .invoke("QueryYakScriptGroup", {All, ExcludeType})
            .then((res: QueryYakScriptGroupResponse) => {
                resolve(res.Group)
            })
            .catch((e) => {
                reject(e)
                yakitNotify("error", "获取本地插件组：" + e)
            })
    })
}

/**本地插件组名字修改 */
export const apiFetchRenameYakScriptGroupLocal: (Group: string, NewGroup: string) => Promise<null> = (
    Group,
    NewGroup
) => {
    return new Promise((resolve, reject) => {
        ipcRenderer
            .invoke("RenameYakScriptGroup", {Group, NewGroup})
            .then((res: null) => {
                resolve(null)
            })
            .catch((e) => {
                reject(e)
                yakitNotify("error", "修改本地插件组名：" + e)
            })
    })
}

/**本地插件组删除 */
export const apiFetchDeleteYakScriptGroupLocal: (Group: string) => Promise<null> = (Group) => {
    return new Promise((resolve, reject) => {
        ipcRenderer
            .invoke("DeleteYakScriptGroup", {Group})
            .then((res: null) => {
                resolve(null)
            })
            .catch((e) => {
                reject(e)
                yakitNotify("error", "删除本地插件组：" + e)
            })
    })
}

/**本地获取插件所在插件组和其他插件组 */
export const apiFetchGetYakScriptGroupLocal: (params: QueryYakScriptRequest) => Promise<GetYakScriptGroupResponse> = (
    params
) => {
    return new Promise((resolve, reject) => {
        ipcRenderer
            .invoke("GetYakScriptGroup", params)
            .then((res: GetYakScriptGroupResponse) => {
                resolve(res)
            })
            .catch((e) => {
                reject(e)
                yakitNotify("error", "" + e)
            })
    })
}

/**本地更新插件所在组&新增插件组 */
export const apiFetchSaveYakScriptGroupLocal: (params: SaveYakScriptGroupRequest) => Promise<null> = (params) => {
    return new Promise((resolve, reject) => {
        ipcRenderer
            .invoke("SaveYakScriptGroup", params)
            .then((res: null) => {
                resolve(null)
            })
            .catch((e) => {
                reject(e)
                yakitNotify("error", "更新本地插件所在组：" + e)
            })
    })
}

/**本地插件组重置为线上插件组 */
export const apiFetchResetYakScriptGroup: (params: ResetYakScriptGroupRequest) => Promise<null> = (params) => {
    return new Promise((resolve, reject) => {
        ipcRenderer
            .invoke("ResetYakScriptGroup", params)
            .then((res: null) => {
                resolve(null)
            })
            .catch((e) => {
                reject(e)
                yakitNotify("error", "重置失败：" + e)
            })
    })
}

/** 线上获取插件组数据 */
export const apiFetchQueryYakScriptGroupOnline: () => Promise<API.GroupResponse> = () => {
    return new Promise((resolve, reject) => {
        try {
            NetWorkApi<any, API.GroupResponse>({
                method: "get",
                url: "group"
            })
                .then((res) => {
                    resolve(res)
                })
                .catch((err) => {
                    yakitNotify("error", "获取插件组失败：" + err)
                    reject(err)
                })
        } catch (error) {
            yakitNotify("error", "获取插件组失败：" + error)
            reject(error)
        }
    })
}

/**线上插件组名字修改 */
export interface PluginGroupRename {
    group: string
    newGroup: string
}
export const apiFetchRenameYakScriptGroupOnline: (query: PluginGroupRename) => Promise<API.ActionSucceeded> = (
    query
) => {
    return new Promise((resolve, reject) => {
        try {
            NetWorkApi<PluginGroupRename, API.ActionSucceeded>({
                method: "get",
                url: "rename/group",
                params: query
            })
                .then((res) => {
                    resolve(res)
                })
                .catch((err) => {
                    yakitNotify("error", "修改插件组名失败：" + err)
                    reject(err)
                })
        } catch (error) {
            yakitNotify("error", "修改插件组名失败：" + error)
            reject(error)
        }
    })
}

/**线上插件组删除 */
export interface PluginGroupDel {
    group: string
}
export const apiFetchDeleteYakScriptGroupOnline: (query: PluginGroupDel) => Promise<API.ActionSucceeded> = (query) => {
    return new Promise((resolve, reject) => {
        try {
            NetWorkApi<PluginGroupDel, API.ActionSucceeded>({
                method: "delete",
                url: "group",
                params: query
            })
                .then((res) => {
                    resolve(res)
                })
                .catch((err) => {
                    yakitNotify("error", "删除插件组失败1：" + err)
                    reject(err)
                })
        } catch (error) {
            yakitNotify("error", "删除插件组失败：" + error)
            reject(error)
        }
    })
}

/** 线上获取插件所在插件组和其他插件组 */
export const apiFetchGetYakScriptGroupOnline: (params: API.PluginsGroupRequest) => Promise<API.PluginsGroupResponse> = (
    params
) => {
    return new Promise((resolve, reject) => {
        try {
            NetWorkApi<API.PluginsGroupRequest, API.PluginsGroupResponse>({
                method: "get",
                url: "plugins/group",
                data: params
            })
                .then((res) => {
                    resolve(res)
                })
                .catch((err) => {
                    yakitNotify("error", "获取失败：" + err)
                    reject(err)
                })
        } catch (error) {
            yakitNotify("error", "获取失败：" + error)
            reject(error)
        }
    })
}

/**线上更新插件所在组&新增插件组 */
export const apiFetchSaveYakScriptGroupOnline: (params: API.GroupRequest) => Promise<API.ActionSucceeded> = (
    params
) => {
    return new Promise((resolve, reject) => {
        try {
            NetWorkApi<API.GroupRequest, API.ActionSucceeded>({
                method: "post",
                url: "group",
                data: params
            })
                .then((res) => {
                    resolve(res)
                })
                .catch((err) => {
                    yakitNotify("error", "更新失败：" + err)
                    reject(err)
                })
        } catch (error) {
            yakitNotify("error", "更新失败：" + error)
            reject(error)
        }
    })
}

/** 插件商店 获取线上组 不需要登录*/
export const apiFetchQueryYakScriptGroupOnlineNotLoggedIn: () => Promise<API.GroupResponse> = () => {
    return new Promise((resolve, reject) => {
        try {
            NetWorkApi<any, API.GroupResponse>({
                method: "get",
                url: "group/search"
            })
                .then((res) => {
                    resolve(res)
                })
                .catch((err) => {
                    yakitNotify("error", "获取插件组失败：" + err)
                    reject(err)
                })
        } catch (error) {
            yakitNotify("error", "获取插件组失败：" + error)
            reject(error)
        }
    })
}

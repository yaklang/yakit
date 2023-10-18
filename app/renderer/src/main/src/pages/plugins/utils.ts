import {PluginFilterParams, PluginListPageMeta, PluginSearchParams} from "./baseTemplateType"
import cloneDeep from "lodash/cloneDeep"
import {YakitPluginListOnlineResponse} from "./online/PluginsOnlineType"
import {NetWorkApi, requestConfig} from "@/services/fetch"
import {API} from "@/services/swagger/resposeType"
import {yakitNotify} from "@/utils/notification"
import {isCommunityEdition} from "@/utils/envfile"
import {useStore} from "@/store"

const {ipcRenderer} = window.require("electron")

// 删除对象里值为 undefined 的键值对
const delObjectInvalidValue = (obj: Record<string, any>) => {
    const data = cloneDeep(obj)
    const keys = Object.keys(data)
    for (let key of keys) {
        if (data[key] === undefined) delete data[key]
    }
    return data
}

// 开发参数 转换为 接口参数
export const convertOnlineRequestParams = (
    filter: PluginFilterParams,
    search: PluginSearchParams,
    pageParams: PluginListPageMeta
): PluginsQueryProps => {
    const data: PluginsQueryProps = {
        page: pageParams.page,
        limit: pageParams.limit,
        order: pageParams.order || "desc",
        order_by: pageParams.order_by || "",
        // search
        keywords: search.type === "keyword" ? search.keyword : "",
        user_name: search.type === "userName" ? search.userName : "",

        // filter
        plugin_type: filter.plugin_type?.map((ele) => ele.value),
        status: filter.status?.map((ele) => Number(ele.value)) || [],
        tags: filter.tags?.map((ele) => ele.value) || [],
        is_private: filter.plugin_private?.map((ele) => ele.value === "true") || [],
        group: filter.plugin_group?.map((ele) => ele.value) || []
    }
    return delObjectInvalidValue(data)
}

export interface PluginsQueryProps extends API.PluginsWhereListRequest, PluginListPageMeta {}
/**插件商店这边需要token */
function PluginNetWorkApi<T extends {token?: string}, D>(params: requestConfig<T>): Promise<D> {
    return new Promise(async (resolve, reject) => {
        try {
            const userInfo = await ipcRenderer.invoke("get-login-user-info", {})
            if (params.data && userInfo) {
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
                    order: query.order||'desc',
                    order_by: query.order_by
                },
                data: {...query}
            })
                .then((res: YakitPluginListOnlineResponse) => {
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
                    yakitNotify("error", "获取插件商店列表失败:" + err)
                    reject(err)
                })
        } catch (error) {
            yakitNotify("error", "获取插件商店列表失败:" + error)
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
const apiFetchGroupStatistics: (query?: API.PluginsSearchRequest) => Promise<API.PluginsSearchResponse> = (query) => {
    return new Promise((resolve, reject) => {
        try {
            PluginNetWorkApi<API.PluginsSearchRequest, API.PluginsSearchResponse>({
                method: "post",
                url: "plugins/search",
                data: {...query}
            })
                .then((res: API.PluginsSearchResponse) => {
                    const data: API.PluginsSearch[] = res.data.filter((ele) => (ele.data || []).length > 0)
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
                    yakitNotify("error", "获取插件商店统计数据失败:" + err)
                    reject(err)
                })
        } catch (error) {
            yakitNotify("error", "获取插件商店统计数据失败:" + error)
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

/**插件审核左侧统计 */
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
                    if (isCommunityEdition()) {
                        // 插件类型、Tag、审核状态
                        const newData = (res.data || []).filter((ele) => ele.groupName !== "插件分组")
                        resolve({
                            ...res,
                            data: newData
                        })
                    } else {
                        // 插件类型、Tag、审核状态、插件组（线上分组）
                        const newData = (res.data || []).map((ele) => {
                            if (ele.groupName === "插件分组") {
                                const newList = (ele.data || []).map((n) => ({
                                    ...n,
                                    label: n.label.replace(/^"+|"+$/g, "")
                                }))
                                return {
                                    ...ele,
                                    data: newList
                                }
                            }
                            return ele
                        })
                        resolve({
                            data: newData
                        })
                    }
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

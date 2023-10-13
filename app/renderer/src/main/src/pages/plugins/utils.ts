import {PluginFilterParams, PluginListPageMeta, PluginSearchParams} from "./baseTemplateType"
import cloneDeep from "lodash/cloneDeep"
import {YakitPluginListOnlineResponse} from "./online/PluginsOnlineType"
import {NetWorkApi} from "@/services/fetch"
import {API} from "@/services/swagger/resposeType"

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
export const convertRequestParams = (
    filter: PluginFilterParams,
    search: PluginSearchParams,
    pageParams: PluginListPageMeta
): PluginsQueryProps => {
    const data: PluginsQueryProps = {
        page: pageParams.page,
        limit: pageParams.limit,
        order: pageParams.order || "",
        order_by: pageParams.order_by || "",
        // search
        keywords: search.type === "keyword" ? search.keyword : "", //关键字
        user_name: search.type === "userName" ? search.userName : "", // 作者
        // filter
        plugin_type: filter.type, //插件类型
        status: filter.status?.map((ele) => Number(ele)) || [], // 审核状态
        tags: filter.tags, // tag搜索
        is_private: filter.state?.map((ele) => !!Number(ele)), // 公开0 false;私密1 true\
        // 插件商店
        
        // 企业版
        group: filter.groups
    }
    return delObjectInvalidValue(data)
}
export interface PluginsQueryProps extends API.PluginsWhere {
    order: PluginListPageMeta["order"]
    order_by: PluginListPageMeta["order_by"]
}
/**线上插件基础接口 */
const apiFetchList: (query: PluginsQueryProps) => Promise<YakitPluginListOnlineResponse> = (query) => {
    return new Promise((resolve, reject) => {
        try {
            NetWorkApi<PluginsQueryProps, YakitPluginListOnlineResponse>({
                method: "get",
                url: "plugins",
                params: {
                    page: query.page,
                    limit: query.limit,
                    order: query.order,
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
                    reject(err)
                })
        } catch (error) {
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
                    reject(err)
                })
        } catch (error) {
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
                    reject(err)
                })
        } catch (error) {
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
                    reject(err)
                })
        } catch (error) {
            reject(error)
        }
    })
}

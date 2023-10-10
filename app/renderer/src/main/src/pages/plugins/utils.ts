import {PluginFilterParams, PluginSearchParams} from "./baseTemplateType"
import cloneDeep from "lodash/cloneDeep"

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
    page: {page: number; limit?: number}
) => {
    const data: any = {
        type: (filter.type || []).join(",") || undefined,
        status: (filter.status || []).join(",") || undefined,
        tags: (filter.tags || []).join(",") || undefined,
        groups: (filter.groups || []).join(",") || undefined,
        state: (filter.state || []).join(",") || undefined,
        keyword: search.keyword || undefined,
        userName: search.userName || undefined,
        page: page.page || 1,
        limit: page?.limit || 20
    }
    return delObjectInvalidValue(data)
}

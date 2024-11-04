import { cloneDeep } from "lodash"
import {FilterDataItem, FilterMatcherType, MITMAdvancedFilter, MITMFilterData, MITMFilterSchema} from "./MITMFilters"
import { defaultMITMFilterData } from "@/defaultConstants/mitm"

/**首字母是小写转大写，首字母是大写转小写 */
const toggleCase = (str) => {
    if (str.length === 0) return ""

    const firstChar = str.charAt(0)
    const isFirstCharLower = firstChar === firstChar.toLowerCase()

    if (isFirstCharLower) {
        return firstChar.toUpperCase() + str.slice(1)
    } else {
        return firstChar.toLowerCase() + str.slice(1)
    }
}

export interface MITMFilterUIProps {
    baseFilter: Omit<MITMFilterSchema, "FilterData">
    advancedFilters: MITMAdvancedFilter[]
}

const specialFiledList = ["IncludeSuffix", "ExcludeSuffix", "ExcludeMIME"]
/**
 * @name 前端数据转为后端数据
 * @description {MITMFilterUIProps→MITMFilterData}
 */

export const convertLocalMITMFilterRequest = (query: MITMFilterUIProps): MITMFilterData => {
    const {baseFilter, advancedFilters} = query
    let data: MITMFilterData =cloneDeep(defaultMITMFilterData)
    /**baseFilter */
    Object.entries(baseFilter).forEach(([key, value]) => {
        const field: keyof MITMFilterData = getMITMField(key)
        let matcherType: FilterMatcherType = "word"
        switch (field) {
            case "IncludeSuffix":
            case "ExcludeSuffix":
                matcherType = "suffix"
                break
            case "ExcludeMIME":
                matcherType = "mime"
                break
            default:
                matcherType = "word"
                break
        }

        if (!!value.length) {
            const item: FilterDataItem = {
                MatcherType: matcherType,
                Group: value
            }
            data[field] = [item]
        }
    })

    /**advancedFilters */
    advancedFilters.forEach((item) => {
        if (item.Field) {
            data[item.Field].push({
                MatcherType: item.MatcherType,
                Group: item.Group
            })
        }
    })
    return data
}

const getMITMField = (filed) => {
    switch (filed) {
        case "ExcludeMIME":
            return "excludeContentTypes"
        case "excludeContentTypes":
            return "ExcludeMIME"

        case "IncludeHostnames":
            return "includeHostname"
        case "includeHostname":
            return "IncludeHostnames"

        case "ExcludeHostnames":
            return "excludeHostname"
        case "excludeHostname":
            return "ExcludeHostnames"

        case "ExcludeMethods":
            return "excludeMethod"
        case "excludeMethod":
            return "ExcludeMethods"

        default:
            return toggleCase(filed)
    }
}
/**后端接口数据结构转为前端结构，页面显示 */
export const convertMITMFilterUI = (FilterData: MITMFilterData): MITMFilterUIProps => {
    let data: MITMFilterUIProps = {
        baseFilter: {
            includeHostname: [],
            excludeHostname: [],
            includeSuffix: [],
            excludeSuffix: [],
            includeUri: [],
            excludeUri: [],
            excludeMethod: [],
            excludeContentTypes: []
        },
        advancedFilters: []
    }
    if (!FilterData) return data
    let advancedFilters: MITMAdvancedFilter[] = []
    Object.entries(FilterData || {}).forEach(([key, value]) => {
        const field: keyof Omit<MITMFilterSchema, "FilterData"> = getMITMField(key)
        if (specialFiledList.includes(key)) {
            data.baseFilter[field] = (value[0] && value[0].Group) || []
        } else {
            const keyWordItem = value.find((item: FilterDataItem) => item.MatcherType === "word")
            if (keyWordItem) {
                data.baseFilter[field] = keyWordItem.Group
            }
            const advancedList = value.filter((item: FilterDataItem) => item.MatcherType !== "word")
            if (advancedList.length > 0) {
                const list = advancedList.map((item) => ({
                    Field: key,
                    Group: item.Group,
                    MatcherType: item.MatcherType
                }))
                advancedFilters = [...advancedFilters, ...list]
            }
        }
    })
    data.advancedFilters = advancedFilters
    return data
}

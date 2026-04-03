import {AutoCompleteProps} from "antd"
import {SizeType} from "antd/lib/config-provider/SizeContext"
import {CacheDataHistoryProps} from "../utils"
import {BaseSelectRef} from "rc-select"
import {CSSProperties, ReactNode} from "react"

/**
 * @description YakitAutoCompleteProps 的属性
 * @augments AutoCompleteProps 继承antd的 AutoCompleteProps 默认属性
 * @param {"small" | "middle" | "large" } size  默认middle
 * @param {string} cacheHistoryDataKey 用来缓存/获取历史数据的setRemoteValue/getRemoteValue,默认缓存 options 和 defaultValue
 * @param {number} cacheHistoryListLength 缓存的历史记录list长度
 * @param {boolean} isCacheDefaultValue 是否缓存默认值
 */
export interface YakitAutoCompleteProps extends AutoCompleteProps {
    size?: "small" | "middle" | "large"
    cacheHistoryDataKey?: string
    cacheHistoryListLength?: number
    /**是否缓存默认值 */
    isCacheDefaultValue?: boolean
    ref?: React.ForwardedRef<YakitAutoCompleteRefProps> & Ref<BaseSelectRef>
    /** 初始默认值 主要用于缓存值不存在时*/
    initValue?: string
    wrapperStyle?: CSSProperties
    /** 是否在显隐时使用Loading，Loading会导致控件闪烁 默认为true*/
    isInit?: boolean
    /**
     * 为 true 时下拉分为两组：上方为当前输入的模糊匹配结果, 如果没有对应模糊搜索结果展示为"无"
     */
    groupSearchWithAll?: boolean
    /** 上方分组标题 */
    searchResultGroupLabel?: ReactNode
    /** 无匹配或输入为空时上方分组展示的节点 */
    searchResultEmptyLabel?: ReactNode
    /** 下方分组标题 */
    allOptionsGroupLabel?: ReactNode
}

export interface YakitAutoCompleteRefProps {
    onSetRemoteValues: (s: string) => void
    onGetRemoteValues: () => void
}

export interface YakitAutoCompleteCacheDataHistoryProps extends CacheDataHistoryProps {}

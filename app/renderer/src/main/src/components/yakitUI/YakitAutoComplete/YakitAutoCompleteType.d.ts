import {AutoCompleteProps} from "antd"
import {SizeType} from "antd/lib/config-provider/SizeContext"
import { CacheDataHistoryProps } from "../utils"

/**
 * @description YakitAutoCompleteProps 的属性
 * @augments AutoCompleteProps 继承antd的 AutoCompleteProps 默认属性
 * @param {"small" | "middle" | "large" } size  默认middle
 * @param {string} cacheHistoryDataKey 用来缓存/获取历史数据的setRemoteValue/getRemoteValue,默认缓存 options 和 defaultValue
 * @param {number} cacheHistoryListLength 缓存的历史记录list长度
 */
export interface YakitAutoCompleteProps extends AutoCompleteProps {
    size?: "small" | "middle" | "large"
    cacheHistoryDataKey?: string
    cacheHistoryListLength?: number
    ref?: React.ForwardedRef<YakitAutoCompleteRefProps>
}

export interface YakitAutoCompleteRefProps {
    onSetRemoteValues: (s: string) => void
    onGetRemoteValues: () => void
}

export interface YakitAutoCompleteCacheDataHistoryProps extends CacheDataHistoryProps{
  
}
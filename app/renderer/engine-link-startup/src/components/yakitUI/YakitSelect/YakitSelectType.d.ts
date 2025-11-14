import {SelectProps} from "antd"
import {OptionProps} from "rc-select/lib/Option"
import {ReactNode} from "react"
import type {YakitSizeType} from "../YakitInputNumber/YakitInputNumberType"
import {CacheDataHistoryProps, YakitOptionTypeProps} from "../utils"
import {BaseSelectRef} from "rc-select"
import {BaseOptionType, DefaultOptionType} from "antd/lib/select"
import {type} from "os"

/**
 * @description: YakitSelectProps
 * @augments YakitSelectProps 继承antd的 SelectProps 默认属性
 * @param {string} wrapperClassName 装饰div的className
 * @param {CSSProperties} wrapperStyle 装饰div的style
 * @param {string} cacheHistoryDataKey 缓存数据 key值
 * @param {number} cacheHistoryListLength 缓存数据 list长度
 * @param {OptionType} defaultOptions 
 * @param {boolean} isCacheDefaultValue false会缓存默认值，但是不会将默认值显示到页面上
 */

export interface YakitSelectProps<
    ValueType = any,
    OptionType extends BaseOptionType | DefaultOptionType | YakitOptionTypeProps = DefaultOptionType
> extends SelectProps {
    wrapperClassName?: string
    wrapperStyle?: CSSProperties
    size?: YakitSizeType
    /**@name 缓存数据 key键 */
    cacheHistoryDataKey?: string
    /**@name 缓存数据  list长度*/
    cacheHistoryListLength?: number
    defaultOptions?: OptionType
    /** false会缓存默认值，但是不会将默认值显示到页面上 */
    isCacheDefaultValue?: boolean
}
export interface YakitSelectOptionProps extends OptionProps {}

export interface YakitSelectCacheDataHistoryProps extends Omit<CacheDataHistoryProps, "options", "defaultValue"> {
    options?: OptionType
    defaultValue: string[]
}

export interface YakitBaseSelectRef {
    onSetRemoteValues: (s: string[]) => void
    onGetRemoteValues: () => void
}

export interface YakitDefaultOptionType extends DefaultOptionType {
    tabLable?: React.ReactNode
}

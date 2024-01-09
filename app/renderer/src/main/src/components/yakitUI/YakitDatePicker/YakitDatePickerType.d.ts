import {CSSProperties} from "react"

import type {YakitSizeType} from "../YakitInputNumber/YakitInputNumberType"

/**
 * @description YakitInputSearchProps 的属性
 * @augments DatePickerProps 继承antd的Input SearchProps 默认属性
 * @param {YakitSizeType} size  默认middle
 * @param {string} wrapperClassName
 * @param {CSSProperties} wrapperStyle
 */
export interface YakitDatePickerProps extends Omit<DatePickerProps, "size"> {
    size?: YakitSizeType
    wrapperClassName?: string
    wrapperStyle?: CSSProperties
}

/**
 * @description YakitInputSearchProps 的属性
 * @augments DatePickerProps 继承antd的Input SearchProps 默认属性
 * @param {YakitSizeType} size  默认middle
 * @param {string} wrapperClassName
 * @param {CSSProperties} wrapperStyle
 */
export interface YakitRangePickerProps extends Omit<RangePickerProps, "size"> {
    size?: YakitSizeType
    wrapperClassName?: string
    wrapperStyle?: CSSProperties
}

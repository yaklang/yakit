import {InputProps, SelectProps} from "antd"
import {SizeType} from "antd/lib/config-provider/SizeContext"

import { SearchProps, TextAreaProps } from "antd/lib/input"
import { CSSProperties } from "react"

import type {YakitSizeType} from "../YakitInputNumber/YakitInputNumberType"
import {YakitSelectProps} from "../YakitSelect/YakitSelectType"

/**
 * @description YakitInputNumberProps 的属性
 * @augments InputProps 继承antd的Input默认属性
 * @param {YakitSizeType} size  默认middle
 * @param {string} wrapperClassName  
 */
export interface YakitInputProps extends Omit<InputProps, "size"> {
    size?: YakitSizeType
    wrapperClassName?: string
    wrapperStyle?:CSSProperties
}
/**
 * @description YakitInputSearchProps 的属性
 * @augments InputProps 继承antd的Input SearchProps 默认属性
 * @param {YakitSizeType} size  默认middle
 * @param {string} wrapperClassName  
 */
export interface YakitInputSearchProps extends Omit<SearchProps,"size">{
    size?: YakitSizeType
    wrapperClassName?: string
}
/**
 * @description InternalTextAreaProps 的属性
 * @augments InputProps 继承antd的Input TextAreaProps 默认属性
 * @param {string} wrapperClassName
 */
export interface InternalTextAreaProps extends TextAreaProps {
    wrapperClassName?: string
}

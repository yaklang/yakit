import {InputProps} from "antd"
import {SizeType} from "antd/lib/config-provider/SizeContext"
import { SearchProps } from "antd/lib/input"
import type {YakitSizeType} from "../YakitInputNumber/YakitInputNumberType"

/**
 * @description YakitInputNumberProps 的属性
 * @augments InputProps 继承antd的Input默认属性
 * @param {YakitSizeType} size  默认middle
 * @param {string} wrapperClassName  
 */
export interface YakitInputProps extends Omit<InputProps, "size"> {
    size?: YakitSizeType
    wrapperClassName?: string
}

export interface YakitInputSearchProps extends Omit<SearchProps,"size">{
    size?: YakitSizeType
    wrapperClassName?: string
}
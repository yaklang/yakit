import {InputProps} from "antd"
import {SizeType} from "antd/lib/config-provider/SizeContext"
<<<<<<< HEAD
<<<<<<< HEAD
import { SearchProps, TextAreaProps } from "antd/lib/input"
=======
import { SearchProps } from "antd/lib/input"
>>>>>>> 1ceae5c8 (增加搜索组件，两种样式中的一种，另外一种未完成)
=======
import { SearchProps, TextAreaProps } from "antd/lib/input"
>>>>>>> 324951bc (yakitInput,增加文本域)
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

<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> 324951bc (yakitInput,增加文本域)
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
export interface InternalTextAreaProps extends TextAreaProps{
    wrapperClassName?: string
}
<<<<<<< HEAD
=======
export interface YakitInputSearchProps extends Omit<SearchProps,"size">{
    size?: YakitSizeType
    wrapperClassName?: string
}
>>>>>>> 1ceae5c8 (增加搜索组件，两种样式中的一种，另外一种未完成)
=======
>>>>>>> 324951bc (yakitInput,增加文本域)

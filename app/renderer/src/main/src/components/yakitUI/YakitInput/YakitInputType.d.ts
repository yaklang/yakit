import {InputProps} from "antd"
import {SizeType} from "antd/lib/config-provider/SizeContext"

/**
 * @description YakitInputNumberProps 的属性
 * @augments InputProps 继承antd的Input默认属性
 * @param {YakitSizeType} size  默认middle
 */
export interface YakitInputProps extends Omit<InputProps, "size"> {
    size?: YakitSizeType
    wrapperClassName?: string
}
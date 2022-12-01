import {InputNumberProps} from "antd"
import {SizeType} from "antd/lib/config-provider/SizeContext"

export declare type YakitSizeType = "small" | "middle" | "large" | "maxLarge" | undefined

/**
 * @description YakitInputNumberProps 的属性
 * @augments InputNumberProps 继承antd的InputNumber默认属性
 * @param {horizontal | vertical} type  默认vertical
 * @param {YakitSizeType} size  默认middle
 */
export interface YakitInputNumberProps extends Omit<InputNumberProps, "size"> {
    type?: "horizontal" | "vertical"
    size?: YakitSizeType
}

import {RadioGroupProps} from "antd"
import type {YakitSizeType} from "../YakitInputNumber/YakitInputNumberType"

/**
 * @description: 按钮单选框Props
 * @augments RadioGroupProps 继承antd的 RadioGroupProps 默认属性
 * @property {YakitSizeType} size  默认middle
 * @property {string} className
 * @property {string} wrapClassName
 */
export interface YakitRadioButtonsProps extends Omit<RadioGroupProps, "size" | "optionType"> {
    size?: YakitSizeType
    className?: string
    wrapClassName?: string
}

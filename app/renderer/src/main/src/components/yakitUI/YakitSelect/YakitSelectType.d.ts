import {SelectProps} from "antd"
import {OptionProps} from "rc-select/lib/Option"
import {ReactNode} from "react"
import type {YakitSizeType} from "../YakitInputNumber/YakitInputNumberType"

/**
 * @description: YakitSelectProps
 * @augments SwitchProps 继承antd的 SelectProps 默认属性
 * @param {string} wrapperClassName Switch装饰div的className
 * @param {CSSProperties} wrapperStyle Switch装饰div的style
 */

export interface YakitSelectProps<
    ValueType = any,
    OptionType extends BaseOptionType | DefaultOptionType = DefaultOptionType
> extends SelectProps {
    wrapperClassName?: string
    wrapperStyle?: CSSProperties
    size?: YakitSizeType
}
export interface YakitSelectOptionProps extends OptionProps {}

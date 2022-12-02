import {SelectProps} from "antd"
import {OptionProps} from "rc-select/lib/Option"
import {ReactNode} from "react"

/**
 * @description: YakitSelectProps
 * @augments SwitchProps 继承antd的 SelectProps 默认属性
 * @param {string} wrapperClassName Switch装饰div的className
 */

export interface YakitSelectProps<
    ValueType = any,
    OptionType extends BaseOptionType | DefaultOptionType = DefaultOptionType
> extends SelectProps {
    wrapperClassName?:string
    wrapperStyle?:CSSProperties
}
export interface YakitSelectOptionProps extends OptionProps {}

import {SwitchProps} from "antd"
import type {YakitSizeType} from "../YakitInputNumber/YakitInputNumberType"

/**
 * @description YakitInputNumberProps 的属性
 * @augments SwitchProps 继承antd的SwitchProps默认属性
 * @param {YakitSizeType} size  默认middle
 * @param {boolean} showInnerText  是否显示里面有 开/关 的文字 
 * @param {boolean} showInnerIcon  是否显示里面图标 
 * @param {string} wrapperClassName Switch装饰div的className
 */
export interface YakitSwitchProps extends Omit<SwitchProps, "size"> {
    size?: YakitSizeType
    showInnerText?:boolean
    showInnerIcon?:boolean
    wrapperClassName?:string
}

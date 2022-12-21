import { CheckboxProps } from "antd";


/**
 * @description YakitCheckboxPropsProps 的属性
 * @augments CheckboxProps 继承antd的 CheckboxProps 默认属性
 * @param {string} wrapperClassName  
 */
export interface YakitCheckboxProps extends CheckboxProps{
    wrapperClassName?:string
}
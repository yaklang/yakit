import {TagProps} from "antd"

/**
 * @description YakitTagProps 的属性
 * @augments TagProps 继承antd的TagProps默认属性
 * @param {middle|large|small} size 默认middle
 * @param {"danger" | "info" | "success" | "warning" | "purple" | "blue" | "cyan" | "bluePurple"} color 颜色
 * @param {boolean} disable 
 */

export interface YakitTagProps extends Omit<TagProps, "color"> {
    size?: "small" | "middle" | "large"
    color?: "danger" | "info" | "success" | "warning" | "purple" | "blue" | "cyan" | "bluePurple"
    disable?:boolean
}

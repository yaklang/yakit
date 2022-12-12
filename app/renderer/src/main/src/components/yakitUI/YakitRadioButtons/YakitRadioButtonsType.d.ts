import {RadioGroupProps} from "antd"

/**
 * @description: 按钮单选框Props
 * @param optionType 弃用
 * @param {"small" | "middle" | "large" | "maxLarge"} size  默认middle
 * @augments RadioGroupProps 继承antd的 RadioGroupProps 默认属性
 * @params {string} className RadioGroup  className
 */
export interface YakitRadioButtonsProps extends Omit<RadioGroupProps, "size"> {
    size?: "small" | "middle" | "large" | "maxLarge"
    className?: string
}

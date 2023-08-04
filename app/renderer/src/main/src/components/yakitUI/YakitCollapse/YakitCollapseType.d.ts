import { CollapseProps } from "antd";
/**
 * @description: YakitSelectProps
 * @augments YakitCollapseProps 继承antd的 CollapseProps 默认属性
 * @param {'default'|'grey'} type Collapse背景色类型
 * @param {string} wrapperClassName Switch装饰div的className
 * @param {CSSProperties} wrapperStyle Switch装饰div的style
 */
export interface YakitCollapseProps extends CollapseProps{
    type?:'default'|'grey'
    wrapperClassName?: string
    wrapperStyle?: CSSProperties
}
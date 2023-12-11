import { CollapsePanelProps, CollapseProps } from "antd";
/**
 * @description: YakitSelectProps
 * @augments YakitCollapseProps 继承antd的 CollapseProps 默认属性
 * @param {'default'|'grey'} type Collapse背景色类型
 * @param {boolean} divider 是否有分割线
 * @param {string} wrapperClassName Switch装饰div的className
 * @param {CSSProperties} wrapperStyle Switch装饰div的style
 */
export interface YakitCollapseProps extends CollapseProps{
    type?:'default'|'grey'
    divider?:boolean
    wrapperClassName?: string
    wrapperStyle?: CSSProperties
}
/**
 * @description: YakitPanelProps
 * @augments YakitPanelProps 继承antd的 CollapsePanelProps 默认属性
 */
export interface YakitPanelProps extends CollapsePanelProps{

}
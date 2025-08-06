import {CollapsePanelProps, CollapseProps} from "antd"
/**
 * @description: YakitSelectProps
 * @augments YakitCollapseProps 继承antd的 CollapseProps 默认属性
 */
export interface YakitCollapseProps extends Omit<CollapseProps, "ghost"> {
    noActiveBg?: boolean // 是否在面板未展开时显示背景色
}
/**
 * @description: YakitPanelProps
 * @augments YakitPanelProps 继承antd的 CollapsePanelProps 默认属性
 */
export interface YakitPanelProps extends CollapsePanelProps {}

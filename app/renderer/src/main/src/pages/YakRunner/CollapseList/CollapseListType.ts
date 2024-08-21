import {CollapseProps} from "antd"
import {ReactNode} from "react"
import {Selection} from "../RunnerTabs/RunnerTabsType"

export interface CollapseListProp<T> {
    /**
     * @name 适用场景
     * @description sideBar-侧边栏场景 output-底部输出场景
     * @default sideBar
     */
    type?: "sideBar" | "output"
    panelKey?: string
    onlyKey?: string
    list: T[]
    titleRender: (info: T) => ReactNode
    renderItem: (info: T) => ReactNode
    collapseProps?: CollapseProps
    isShowBottom?: boolean
}

export interface HelpInfoListProps {
    onJumpToEditor: (v: Selection) => void
}

export interface DefinitionListProps {
    lineContent: string
    range: Selection
}

import { CollapseProps } from "antd"
import {ReactNode} from "react"
import { monaco } from "react-monaco-editor"

export interface CollapseListProp<T> {
    /**
     * @name 适用场景
     * @description sideBar-侧边栏场景 output-底部输出场景
     * @default sideBar
     */
    type?: "sideBar" | "output"
    onlyKey: string
    list: T[]
    titleRender: (info: T) => ReactNode
    renderItem: (info: T) => ReactNode
    collapseProps?: CollapseProps
}

export interface HelpInfoListProps {}

export interface DefinitionListProps {
    lineContent: string
    range: monaco.Range
}

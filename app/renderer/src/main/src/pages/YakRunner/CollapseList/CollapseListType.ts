import {ReactNode} from "react"

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
}

export interface HelpInfoListProps {
    list: {key: number}[]
}

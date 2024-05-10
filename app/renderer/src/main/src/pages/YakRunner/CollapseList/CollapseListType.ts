import {ReactNode} from "react"

export interface CollapseListProp<T> {
    onlyKey: string
    list: T[]
    titleRender: (info: T) => ReactNode
    renderItem: (info: T) => ReactNode
}

export interface HelpInfoListProps {
    list: {key: number}[]
}

import {ReactNode} from "react"

export interface FileNodeProps {
    /** 文件名 */
    name: string
    /** 文件绝对路径 */
    path: string
    /** 是否为文件夹 */
    isFolder: boolean
    /** 显示icon */
    icon: string
    isLeaf?: boolean
    children?: FileNodeProps[]
}

export interface FileTreeProps {
    data: FileNodeProps[]
    onLoadData: (node: FileNodeProps) => Promise<any>
    onSelect?: (
        selectedKeys: string[],
        e: {selected: boolean; selectedNodes: FileNodeProps[]; node: FileNodeProps}
    ) => any
    onExpand?: (expandedKeys: string[], e: {expanded: boolean; node: FileNodeProps}) => any
}

export interface FileTreeNodeProps {
    isDownCtrlCmd: boolean
    info: FileNodeProps

    foucsedKey: string
    selectedKeys: string[]
    expandedKeys: string[]

    onSelected: (selected: boolean, node: FileNodeProps) => any
    onExpanded: (expanded: boolean, node: FileNodeProps) => void
}

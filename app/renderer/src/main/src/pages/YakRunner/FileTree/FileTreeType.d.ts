import {ReactNode} from "react"

// 文件树的结构只需要path 其详细内容则被存入Map中
export interface FileTreeListProps {
    /** 文件绝对路径 */
    path: string
    children?: FileTreeListProps[]
}

// Map存储文件列表详情
export interface FileNodeMapProps {
    /** 文件名 */
    name: string
    /** 文件绝对路径 */
    path: string
    /** 是否为文件夹 */
    isFolder: boolean
    /** 显示icon */
    icon: string
    isLeaf?: boolean
}

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

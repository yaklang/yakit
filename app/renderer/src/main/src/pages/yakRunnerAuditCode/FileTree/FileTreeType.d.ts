import {ReactNode} from "react"
import {YakURLResource} from "@/pages/yakURLTree/data"
// 文件树的结构只需要path 其详细内容则被存入Map中
export interface FileTreeListProps {
    /** 文件绝对路径 */
    path: string
    children?: FileTreeListProps[]
}

// Map存储文件列表详情
export interface FileNodeMapProps {
    /** 父文件路径 */
    parent: string | null
    /** 文件名 */
    name: string
    /** 文件绝对路径 */
    path: string
    /** 是否为文件夹 */
    isFolder: boolean
    /** 显示icon */
    icon: string
    // 是否新建
    isCreate?: boolean
    // 是否读取失败
    isReadFail?: boolean
    isLeaf?: boolean
    // 是否有count
    count?: string
    // 是否有描述
    description?: string
    // 是否展示行号
    line?: number
    // 文件其余数据
    data?: YakURLResource
}

export interface FileNodeProps extends FileNodeMapProps {
    // 层级
    depth: number
    // 底部占位
    isBottom?: boolean
    children?: FileNodeProps[]
}

export interface FileTreeProps {
    data: FileNodeProps[]
    onLoadData: (node: FileNodeProps) => Promise<any>
    foucsedKey: string
    setFoucsedKey: (v: string) => void
    expandedKeys: string[]
    setExpandedKeys: (v: string[]) => void
    onSelect?: (
        selectedKeys: string[],
        e: {selected: boolean; selectedNodes: FileNodeProps[]; node: FileNodeProps}
    ) => any
    onExpand?: (expandedKeys: string[], e: {expanded: boolean; node: FileNodeProps}) => any
}

export interface FileTreeNodeProps {
    info: FileNodeProps

    foucsedKey: string
    selectedKeys: string[]
    expandedKeys: string[]

    onSelected: (selected: boolean, node: FileNodeProps) => any
    onExpanded: (expanded: boolean, node: FileNodeProps) => void
}

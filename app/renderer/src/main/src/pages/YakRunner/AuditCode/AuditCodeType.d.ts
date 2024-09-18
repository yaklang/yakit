import {YakURLResource} from "@/pages/yakURLTree/data"

export interface YakURLKVPair {
    Key: string;
    Value: string;
}

export interface AuditCodeProps {}

export interface AuditTreeProps {
    data: AuditNodeProps[]
    expandedKeys: string[]
    setExpandedKeys: (v: string[]) => void
    onLoadData: (node: AuditNodeProps) => Promise<any>
    foucsedKey: string
    setFoucsedKey: (v: string) => void
    onJump: (v:AuditNodeProps) => void
}

export interface AuditNodeDetailProps{
    fileName: string;
    start_line: number;
    url: string;
}

export interface AuditTreeNodeProps {
    info: AuditNodeProps
    expandedKeys: string[]
    onSelected: (selected: boolean, node: AuditNodeProps, nodeDetail?:AuditNodeDetailProps) => any
    onExpanded: (expanded: boolean, node: AuditNodeProps) => void
    foucsedKey: string
    setFoucsedKey: (v: string) => void
}

// Map存储列表详情
export interface AuditNodeMapProps {
    /** 父路径 */
    parent: string | null
    /** id */
    id: string
    isLeaf?: boolean

    ResourceType: string
    VerboseType: string
    name: string
    Size: number
    Extra: YakURLKVPair[]
}

export interface AuditNodeProps {
    /** 父路径 */
    parent: string | nul
    /** id */
    id: string
    // 层级
    depth: number
    // 可能存在的名称
    name: string
    // 底部占位
    isBottom?: boolean
    isLeaf?: boolean
    children?: FileNodeProps[]

    Extra: YakURLKVPair[]
    ResourceType: string
    VerboseType: string
    name: string
    Size: number
}

export interface AuditYakUrlProps {
    Schema: string
    Location: string
    Path: string
}

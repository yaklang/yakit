export interface AuditCodeProps {}

export interface AuditTreeProps{
    data: AuditNodeProps[]
    expandedKeys: string[]
    setExpandedKeys: (v:string[]) => void
    onLoadData: (node: AuditNodeProps) => Promise<any>
    foucsedKey: string
    setFoucsedKey: (v:string) => void
}

export interface AuditTreeNodeProps {
    info: AuditNodeProps
    expandedKeys: string[]
    onSelected: (selected: boolean, node: AuditNodeProps) => any
    onExpanded: (expanded: boolean, node: AuditNodeProps) => void
    foucsedKey: string
    setFoucsedKey: (v:string) => void
}

export interface AuditNodeProps {
    /** 父文件路径 */
    parent: string | null
    /** 名称 */
    name: string
    /** id */
    id: string
    // 层级
    depth: number
    // 底部占位
    isBottom?: boolean
    isLeaf?: boolean
    children?: FileNodeProps[]
}

export interface AuditYakUrlProps {
    FromRaw: string
    Schema: string
    Location: string
    Path: string
}
import type {DataNode} from "antd/es/tree"
import {EventDataNode} from "antd/lib/tree"
import {SSARisksFilter} from "../YakitAuditHoleTable/YakitAuditHoleTableType"

export interface DocumentCollectProps {
    query: SSARisksFilter
    setQuery: (v: SSARisksFilter) => void
}

export interface DocumentCollectTreeProps {
    data: RealHoleNodeMapProps[]
    expandedKeys: TreeKey[]
    setExpandedKeys: (v: TreeKey[]) => void
    selectedKeys: TreeKey[]
    setSelectedKeys: (v: TreeKey[]) => void
    onLoadData: (node: EventDataNode<DataNode>) => Promise<any>
    wrapClassName?: string
    setSelectedNodes: (v: HoleTreeNode[]) => void
}

export interface HoleTreeNode extends DataNode {
    data?: YakURLResource // 树节点其他额外数据
}

type HoleResourceType = "program" | "source" | "function"

export interface HoleTreeNodeProps {
    info: RealHoleNodeMapProps
    selectedKeys: string
    expandedKeys: TreeKey[]
    onSelected: (selected: boolean, node: RealHoleNodeMapProps) => any
    onExpanded: (expanded: boolean, node: RealHoleNodeMapProps) => void
}

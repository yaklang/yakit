import type {DataNode} from "antd/es/tree"
import {EventDataNode} from "antd/lib/tree"
import {SSARisksFilter} from "../YakitAuditHoleTable/YakitAuditHoleTableType"

export interface DocumentCollectProps {
    query: SSARisksFilter
    setQuery: (v: SSARisksFilter) => void
}

export interface HoleTreeNode extends DataNode {
    data?: YakURLResource // 树节点其他额外数据
}

type HoleResourceType = "program" | "source" | "function"

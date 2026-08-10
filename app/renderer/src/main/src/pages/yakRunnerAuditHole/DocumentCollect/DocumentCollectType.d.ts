import type { DataNode } from 'antd/es/tree'
import { type SSARisksFilter } from '../YakitAuditHoleTable/YakitAuditHoleTableType'
import type { YakURLResource } from '@/pages/yakURLTree/data'

export interface DocumentCollectProps {
  query: SSARisksFilter
  setQuery: (v: SSARisksFilter) => void
}

export interface HoleTreeNode extends DataNode {
  data?: YakURLResource // 树节点其他额外数据
}

type HoleResourceType = 'program' | 'source' | 'function'

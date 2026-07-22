import { ChatStream } from '@/pages/ai-re-act/hooks/aiRender'

export interface AIGroupStreamNodeWrapperProps {
  itemData: ChatStream
  renderNum: number
  /** 该节点在所属 group 子节点列表中的 0-based 下标，由负责排序的父组件透传，用于拼 seqNo */
  groupIndex?: number
}

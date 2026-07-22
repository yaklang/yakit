import type { AIChatQSData } from '@/pages/ai-re-act/hooks/aiRender'

export interface AINodeItemProps {
  itemData: AIChatQSData
  /** 控制渲染，必传 */
  renderNum: number
  /** 组内 0-based 下标，由组列表 map 时透传；仅 STREAM + parentGroupToken 分支使用 */
  groupIndex?: number
}

import type { AIChatQSData } from '@/pages/ai-re-act/hooks/aiRender'

export interface AINodeItemProps {
  itemData: AIChatQSData
  /** 控制渲染，必传 */
  renderNum: number
}

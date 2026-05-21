import { AITool } from '../ai-agent/type/aiTool'

export interface AIToolProps {
  pageId: string
}

export interface AIToolPageItemProps {
  index: number
  data: AITool
  checked?: boolean
  onCheck?: (item: AITool) => void
  onExport?: (item: AITool) => void
  onFavorite: (item: AITool) => Promise<void>
  onRemove: (item: AITool) => Promise<void>
}

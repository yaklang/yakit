import { AIForge } from '../ai-agent/type/forge'

export interface AIForgeProps {
  pageId: string
}

export interface AIForgePageItemProps {
  index: number
  data: AIForge
  checked: boolean
  onCheck: (data: AIForge) => void
  onExport: (data: AIForge) => void
  onRemove: (item: AIForge) => Promise<void>
}

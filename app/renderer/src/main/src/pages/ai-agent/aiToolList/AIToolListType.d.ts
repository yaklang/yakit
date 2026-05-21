import { AITool } from '../type/aiTool'

export interface AIToolListProps {
  onSelectChange?: (selected: boolean) => void
}

export interface AIToolListRef {
  openImport: () => void
  onBatchExport: () => void
}

export type ToolQueryType = 'all' | 'collect'

export interface AIToolListItemProps {
  item: AITool
  checked?: boolean
  onCheck?: (item: AITool) => void
  onSetData: (value: AITool) => void
  onRefresh: () => void
  onSelect: (value: AITool) => void
  onExport?: (item: AITool) => void
}

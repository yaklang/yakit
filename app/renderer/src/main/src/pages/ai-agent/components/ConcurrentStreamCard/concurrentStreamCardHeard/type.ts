import { ChatTaskNodeGroup } from '@/pages/ai-re-act/hooks/aiRender'

export interface ConcurrentStreamCardHeardProps {
  token: string
  isChildWindow: boolean
  expand: boolean
  expandToggle: () => void
  onClickTitle: () => void
  rowData?: ChatTaskNodeGroup
  coordinatorId?: string
  taskIndex?: string | null
}

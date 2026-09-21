import type { ChatTaskNodeGroup } from '@/pages/ai-re-act/hooks/aiRender'

export interface AIChildWindowConcurrentStreamCardHeardProps {
  rowData?: ChatTaskNodeGroup
  onRefresh?: () => void
}

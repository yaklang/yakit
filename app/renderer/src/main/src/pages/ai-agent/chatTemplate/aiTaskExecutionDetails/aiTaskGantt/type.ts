import type { TodoListCardData } from '@/pages/ai-re-act/hooks/aiRender'
import type { AIToDoListStatusEnumType } from '@/pages/ai-agent/defaultConstant'

export type AITaskGanttTodoItem = TodoListCardData['items'][number]

export type AITaskGanttSegmentKind = 'wait' | 'execute' | 'success' | 'skipped' | 'failed'

export interface AITaskGanttSegment {
  kind: AITaskGanttSegmentKind
  startTs: number
  endTs: number
}

export interface AITaskGanttProps {
  items: AITaskGanttTodoItem[]
  className?: string
  hiddenLegendKinds?: AITaskGanttSegmentKind[]
  onLegendToggle?: (kind: AITaskGanttSegmentKind) => void
  legendKindOrder?: AITaskGanttSegmentKind[]
}

export interface AITaskGanttStatusMeta {
  label: string
  tagColor?: 'success' | 'warning' | 'danger' | 'purple' | 'info'
}

export type AITaskGanttStatusMap = Record<AIToDoListStatusEnumType, AITaskGanttStatusMeta>

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
  /** 已隐藏的图例 kind，对应行状态筛选（灰显） */
  hiddenLegendKinds?: AITaskGanttSegmentKind[]
  /** 点击图例切换对应状态行的显示/隐藏 */
  onLegendToggle?: (kind: AITaskGanttSegmentKind) => void
}

export interface AITaskGanttStatusMeta {
  label: string
  tagColor?: 'success' | 'warning' | 'danger' | 'purple' | 'info'
}

export type AITaskGanttStatusMap = Record<AIToDoListStatusEnumType, AITaskGanttStatusMeta>

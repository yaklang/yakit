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
  /** 图例从左到右顺序，与顶部状态统计拖拽结果一致 */
  legendKindOrder?: AITaskGanttSegmentKind[]
}

export interface AITaskGanttStatusMeta {
  label: string
  tagColor?: 'success' | 'warning' | 'danger' | 'purple' | 'info'
}

export type AITaskGanttStatusMap = Record<AIToDoListStatusEnumType, AITaskGanttStatusMeta>

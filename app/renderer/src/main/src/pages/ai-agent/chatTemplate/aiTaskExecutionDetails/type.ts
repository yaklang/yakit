import type { ForgesAndSkillsDynamicItem, PlanItemDetailsData } from '@/pages/ai-re-act/hooks/aiRender'
import type { AIAgentGrpcApi } from '@/pages/ai-re-act/hooks/grpcApi'
import type { PaginationSchema } from '@/pages/invoker/schema'
import type { ThemeColorName } from '@yakit-libs/color'
import type { ReactNode } from 'react'
import type { AITaskGanttSegmentKind } from './aiTaskGantt/type'

export interface AITaskExecutionDetailsProps {
  taskId: string
  taskName?: string
  taskGoal?: string
  onClose?: () => void
}

export type TodoViewMode = 'board' | 'gantt'

/** 统计项 / 图例 → 待办 status，用于点击筛选行 */
export const TODO_STATUS_FILTER_KEYS = ['pending', 'doing', 'done', 'skipped', 'deleted'] as const
export type TodoStatusFilterKey = (typeof TODO_STATUS_FILTER_KEYS)[number]

export const TODO_STATUS_TO_FILTER_KEY: Record<string, TodoStatusFilterKey> = {
  PENDING: 'pending',
  DOING: 'doing',
  DONE: 'done',
  SKIPPED: 'skipped',
  DELETED: 'deleted',
}

/** 行状态筛选 key → 进度图例 kind（反向表由本表派生） */
export const FILTER_KEY_TO_GANTT_LEGEND: Record<TodoStatusFilterKey, AITaskGanttSegmentKind> = {
  pending: 'wait',
  doing: 'execute',
  done: 'success',
  skipped: 'skipped',
  deleted: 'failed',
}

/** 进度图例 kind → 行状态筛选 key */
export const GANTT_LEGEND_TO_FILTER_KEY = (Object.keys(FILTER_KEY_TO_GANTT_LEGEND) as TodoStatusFilterKey[]).reduce(
  (acc, key) => {
    acc[FILTER_KEY_TO_GANTT_LEGEND[key]] = key
    return acc
  },
  {} as Record<AITaskGanttSegmentKind, TodoStatusFilterKey>,
)

export type PlanItemDetailsCategoryTypes = (
  | AIAgentGrpcApi.PlanItemDetailsFixedItem
  | AIAgentGrpcApi.PlanItemDetailsDynamicToolItem
  | AIAgentGrpcApi.PlanItemDetailsDynamicSkillsItem
  | AIAgentGrpcApi.PlanItemDetailsDynamicForgesItem
)['category']

export type PlanItemDetailsDynamicKeys = {
  [K in keyof PlanItemDetailsData]: PlanItemDetailsData[K] extends { dynamic: any[] } ? K : never
}[keyof PlanItemDetailsData]
export type PlanItemDetailsDynamicItem = PlanItemDetailsData[PlanItemDetailsDynamicKeys]['dynamic'][number]

export interface AITaskDetailsCardListProps {
  type: string
  colTitle: ReactNode
  taskId: string
  fixedList: AIAgentGrpcApi.PlanItemDetailsFixedItem[]
  dynamicList: (PlanItemDetailsDynamicItem | ForgesAndSkillsDynamicItem)[]
}
export interface AITaskDetailsAddPopoverProps {
  title: string
  taskId: string
  type: AITaskDetailsCardListProps['type']
  onClose: () => void
}
export interface AITaskDetailsAddPopoverResponse {
  total: number
  data: AITaskDetailsAddListItem[]
  Pagination: PaginationSchema
}

export interface AITaskDetailsAddListItem {
  label: string
  value: string
  type: string
}
export interface AITaskExecutionDetailsCardProps {
  title: ReactNode
  content: ReactNode
  className?: string
}

export interface AITaskStatisticsStatusItem {
  key: string
  color: Uncapitalize<ThemeColorName>
  title: ReactNode
  footerLeft: number
}
export interface AITaskStatisticsStatusProps {
  list: AITaskStatisticsStatusItem[]
  /** 已隐藏（筛选掉）的状态 key：pending/doing/done/skipped/deleted */
  hiddenKeys?: string[]
  /** 点击状态项切换显示/隐藏；created 为全选/全不选 */
  onToggle?: (key: string) => void
}

export interface AIBrowserProcessesProps {
  list: AIAgentGrpcApi.SessionSnapshot['background_processes']
}

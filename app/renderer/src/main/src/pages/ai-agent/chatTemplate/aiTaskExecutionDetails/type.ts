import { ForgesAndSkillsDynamicItem, PlanItemDetailsData } from '@/pages/ai-re-act/hooks/aiRender'
import { AIAgentGrpcApi } from '@/pages/ai-re-act/hooks/grpcApi'
import { PaginationSchema } from '@/pages/invoker/schema'
import { ThemeColorName } from '@/yakit-colors-generator'
import { ReactNode } from 'react'

export interface AITaskExecutionDetailsProps {
  taskIndex: string
  taskName?: string
  taskGoal?: string
}
export interface AITaskActionItemProps {
  title: ReactNode
  description?: ReactNode
  titleExtra?: ReactNode
  category?: PlanItemDetailsDynamicKeys
}

export type PlanItemDetailsDynamicKeys = {
  [K in keyof PlanItemDetailsData]: PlanItemDetailsData[K] extends { dynamic: any[] } ? K : never
}[keyof PlanItemDetailsData]
export type PlanItemDetailsDynamicItem = PlanItemDetailsData[PlanItemDetailsDynamicKeys]['dynamic'][number]

export interface AITaskDetailsCardListProps {
  type: string
  colTitle: ReactNode
  fixedList: AIAgentGrpcApi.PlanItemDetailsFixedItem[]
  dynamicList: (PlanItemDetailsDynamicItem | ForgesAndSkillsDynamicItem)[]
}
export interface AITaskDetailsAddPopoverProps {
  title: string
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
  color: Uncapitalize<ThemeColorName> | 'neutral-with-border'
  title: ReactNode
  footerLeft: number
  footerRight: ReactNode
}
export interface AITaskStatisticsStatusProps {
  list: AITaskStatisticsStatusItem[]
}

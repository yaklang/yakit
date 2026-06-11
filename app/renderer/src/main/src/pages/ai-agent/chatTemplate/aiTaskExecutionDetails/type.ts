import { PlanItemDetailsData } from '@/pages/ai-re-act/hooks/aiRender'
import { AIAgentGrpcApi } from '@/pages/ai-re-act/hooks/grpcApi'
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
}

type PlanItemDetailsDynamicKeys = {
  [K in keyof PlanItemDetailsData]: PlanItemDetailsData[K] extends { dynamic: any[] } ? K : never
}[keyof PlanItemDetailsData]
type PlanItemDetailsDynamicItem = PlanItemDetailsData[PlanItemDetailsDynamicKeys]['dynamic'][number]
export interface AITaskDetailsCardListProps {
  colTitle: ReactNode
  fixedList: AIAgentGrpcApi.PlanItemDetailsFixedItem[]
  dynamicList: PlanItemDetailsDynamicItem[]
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

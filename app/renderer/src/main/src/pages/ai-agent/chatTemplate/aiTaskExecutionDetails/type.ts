import { ThemeColorName } from '@/yakit-colors-generator'
import { ReactNode } from 'react'

export interface AITaskExecutionDetailsProps {}
export interface AITaskActionItemProps {
  title: ReactNode
  description?: ReactNode
  titleExtra?: ReactNode
}
export interface AITaskExecutionDetailsCardProps {
  title: ReactNode
  children: ReactNode
  className?: string
}

export interface AITaskStatisticsStatusItem {
  key: string
  color: Uncapitalize<ThemeColorName> | 'neutral-with-border'
  title: ReactNode
  footerLeft: ReactNode
  footerRight: ReactNode
}
export interface AITaskStatisticsStatusProps {
  list: AITaskStatisticsStatusItem[]
}

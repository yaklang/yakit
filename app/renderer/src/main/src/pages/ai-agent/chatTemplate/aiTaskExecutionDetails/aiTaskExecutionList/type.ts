import { ReactNode } from 'react'
import { PlanItemDetailsCategoryTypes } from '../type'

export interface AITaskExecutionListProps<T> {
  list: T[]
  header?: ReactNode
  renderItem: (item: T, index: number) => ReactNode
  classNameList?: string
}
export interface AITaskActionItemProps {
  title: string
  description?: string
  titleExtra?: ReactNode
  category?: PlanItemDetailsCategoryTypes
}

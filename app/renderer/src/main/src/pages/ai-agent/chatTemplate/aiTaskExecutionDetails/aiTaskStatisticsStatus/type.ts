import type { ReactNode } from 'react'
import type { ThemeColorName } from '@yakit-libs/color'

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
  /** 拖拽待处理/进行中等状态项，按从左到右重排 */
  onReorder?: (fromKey: string, toKey: string) => void
}

export interface AITaskStatisticsStatusItemBaseProps {
  item: AITaskStatisticsStatusItem
  hidden: boolean
  filterable: boolean
  onToggle?: (key: string) => void
}

export interface AITaskStatisticsStatusSortableItemProps extends AITaskStatisticsStatusItemBaseProps {
  onReorder?: (fromKey: string, toKey: string) => void
}

export type StatDragPayload = { key: string }

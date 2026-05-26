import { ReactNode } from 'react'
import { AIModelConfig } from '../utils'
import { AIOnlineModelListProps } from '../AIModelListType'
import { AIModelTypeEnum } from '../../defaultConstant'

export type AISelectType = 'online' | 'local'
export interface AIModelSelectProps {
  isOpen?: boolean
  className?: string
  mountContainer?: AIOnlineModelListProps['mountContainer']
}
export type EnableThinkingOptType = 'no-set' | 'open' | 'close'
export interface AIModelItemProps {
  type: AIModelTypeEnum
  item: AIModelConfig
  checked: boolean
  isSelected: boolean
  onEdit: (v: AIModelConfig) => void
  onMouseEnterEdit: (e: React.MouseEvent) => void
  onMouseLeaveEdit: (e: React.MouseEvent) => void
}

export interface AIModelSelectListProps {
  type: AIModelTypeEnum
  title: ReactNode
  subTitle: ReactNode
  list: AIModelConfig[]
  onSelect: (v: AIModelConfig, i: number) => void
  onEdit: (v: AIModelConfig, i: number) => void
  dropdownRenderRectRef?: DOMRect
}

export interface AIModelThinkingOptSelectProps {}

export interface AIModelEditContentProps {
  item: AIModelConfig
  index: number
  onEdit?: (v: AIModelConfig) => void
  isRefreshModelNameList: boolean
  onRefreshModelNameList: (item: AIModelConfig, index: number) => void
  modelNameListMapRef: Map<number, ModelNameListRef>
}

export interface ModelNameOptionLabelProps {
  name: string
}
export interface AIModelEditContentItemProps {
  options: {
    label: ReactNode
    value: string
  }[]
  title: ReactNode
  filed: keyof AIModelConfig['Provider'] | keyof AIModelConfig
  value: string
  onChange: (v: string) => void
}

export interface ModelNameListRef {
  loading: boolean
  list: string[]
}

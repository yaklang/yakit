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
  item?: AIModelConfig
  onEdit?: (v: AIModelConfig) => void
}

export interface AIModelEditContentItemProps {
  options: {
    label: string
    value: string
  }[]
  title: string
  filed: keyof AIModelConfig['Provider']
  value: string
  onChange: (v: string) => void
}

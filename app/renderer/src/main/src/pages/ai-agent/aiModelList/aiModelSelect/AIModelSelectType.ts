import type { ReactNode, RefObject } from 'react'
import type { AIModelConfig } from '../utils'
import type { ModalProps } from 'antd'
import { type AIModelTypeEnum } from '../../defaultConstant'

export type AISelectType = 'online' | 'local'
export interface AIModelSelectProps {
  isOpen?: boolean
  className?: string
  mountContainer?: ModalProps['getContainer']
}
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
  dropdownRef: RefObject<HTMLDivElement>
  triggerRef: RefObject<HTMLDivElement>
  /** 下拉框是否展开 */
  open?: boolean
  /** 触发器宽度变化时关闭一级下拉框 */
  onWidthChange: () => void
}

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
  listClassName?: string
  emptyTips?: ReactNode
}

export interface ModelNameListRef {
  loading: boolean
  list: string[]
}

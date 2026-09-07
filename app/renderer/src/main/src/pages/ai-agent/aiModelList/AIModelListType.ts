import type { LocalModelConfig } from '../type/aiModel'
import type { YakitSizeType } from '@/components/yakitUI/YakitInputNumber/YakitInputNumberType'
import type { ForwardedRef, ReactNode } from 'react'
import type { AIModelConfig, AIModelTypeFileName } from './utils'
import type { AIModelTypeEnumType } from '../defaultConstant'

export type AIModelType = 'online' | 'local'

export interface AILocalModelListProps {
  ref: ForwardedRef<AILocalModelListRefProps>
  setLocalTotal: (total: number) => void
}

export interface AILocalModelListRefProps {
  onRefresh: () => void
}
export interface AILocalModelListItemProps {
  item: LocalModelConfig
  onRefresh: () => void
}
export interface AIOnlineModelListItemProps {
  item: AIModelConfig
  onRemove: (item: AIModelConfig) => void
  onEdit: (item: AIModelConfig) => void
  checked: boolean
  modelType: AIModelTypeEnumType
  checkedVariant?: 'outline' | 'circle'
}
export interface OutlineAtomIconByStatusProps {
  isReady?: boolean
  isRunning?: boolean
  iconClassName?: string
  size?: YakitSizeType
}
export interface AILocalModelListItemPromptHintProps {
  title: string
  content: string
  onOk: (b: boolean) => Promise<void>
  onCancel: () => void
}

export interface AILocalModelListWrapperProps {
  title: string
  list: LocalModelConfig[]
  onRefresh: () => void
}

export interface AIOnlineModelProps {
  title?: ReactNode
  subTitle?: ReactNode
  list: AIModelConfig[]
  onRemove: (i: number) => void
  onEdit: (i: number) => void
  onSelect: (v: AIModelConfig, i: number) => void
  modelType: AIOnlineModelListItemProps['modelType']
  /** 选中图标：默认勾选描边，circle 为实心圆勾 */
  checkedVariant?: 'outline' | 'circle'
}

export interface AIModelActionProps {
  fileName: AIModelTypeFileName
  index: number
}

export interface AIModelFreeTagProps {}

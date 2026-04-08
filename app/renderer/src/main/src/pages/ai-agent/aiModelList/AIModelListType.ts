import { LocalModelConfig } from '../type/aiModel'
import { YakitSizeType } from '@/components/yakitUI/YakitInputNumber/YakitInputNumberType'
import { type ModalProps } from 'antd'
import { ReactNode } from 'react'
import { AIModelConfig, AIModelTypeFileName } from './utils'
import { AIModelTypeEnum } from '../defaultConstant'

export interface AIModelListProps extends Partial<Pick<AIOnlineModelListProps, 'mountContainer'>> {}

export type AIModelType = 'online' | 'local'

export interface AIOnlineModelListProps {
  ref: React.ForwardedRef<AIOnlineModelListRefProps>
  onAdd: () => void
  mountContainer?: ModalProps['getContainer']
}

export interface AIOnlineModelListRefProps {
  onRemoveAll: () => void
}

export interface AILocalModelListProps {
  ref: React.ForwardedRef<AILocalModelListRefProps>
  setLocalTotal: (total: number) => void
}

export interface AILocalModelListRefProps {
  onRefresh: () => void
}
export interface AILocalModelListItemProps {
  item: LocalModelConfig
  onRefresh: () => void
  currentPageTabRouteKey: string
}
export interface AIOnlineModelListItemProps {
  item: AIModelConfig
  onRemove: (item: AIModelConfig) => void
  onEdit: (item: AIModelConfig) => void
  checked: boolean
  modelType: `${AIModelTypeEnum}`
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
  currentPageTabRouteKey: string
}

export interface AIOnlineModelProps {
  title?: ReactNode
  subTitle?: ReactNode
  list: AIModelConfig[]
  onRemove: (i: number) => void
  onEdit: (i: number) => void
  onSelect: (v: AIModelConfig, i: number) => void
  modelType: AIOnlineModelListItemProps['modelType']
}

export interface AIOnlineModeSettingProps {
  onRefresh: () => void
}

export interface AIModelActionProps {
  fileName: AIModelTypeFileName
  index: number
}

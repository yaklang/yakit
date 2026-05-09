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
  onEdit: (v: AIModelConfig) => void
}

export interface AIModelSelectListProps {
  type: AIModelTypeEnum
  title: ReactNode
  subTitle: ReactNode
  list: AIModelConfig[]
  onSelect: (v: AIModelConfig, i: number) => void
  onEdit: (v: AIModelConfig, i: number) => void
}

export interface AIModelThinkingOptSelectProps {}

import type { AIReActChatContentsRef } from '../../aiReActChatContents/AIReActChatContentsType'
import type { AIReActChatProps } from '../AIReActChatType'
import type React from 'react'

export interface AIReActChatHeaderProps {
  title?: React.ReactNode
  chatContainerHeaderClassName?: string
  isShowRetract?: boolean
  externalParameters?: AIReActChatProps['externalParameters']

  source?: string
  onDetails?: (e: React.MouseEvent) => void
  handleSwitchShowFreeChat: (show: boolean) => void

  scrollToItemIndex?: AIReActSubAgentTaskProps['scrollToItemIndex']
}

export interface AIReActChatHeaderExternalRightIconProps {
  rightIcon?: NonNullable<AIReActChatProps['externalParameters']>['rightIcon']
}

export interface AIReActSubAgentTaskProps {
  scrollToItemIndex?: AIReActChatContentsRef['scrollToItemIndex']
}

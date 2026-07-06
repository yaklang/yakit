import { AIReActChatProps } from '../AIReActChatType'
import React from 'react'

export interface AIReActChatHeaderProps {
  title?: React.ReactNode
  chatContainerHeaderClassName?: string
  isShowRetract?: boolean
  externalParameters?: AIReActChatProps['externalParameters']

  source?: string
  onDetails?: (e: React.MouseEvent) => void
  handleSwitchShowFreeChat: (show: boolean) => void
}

export interface AIReActChatHeaderExternalRightIconProps {
  rightIcon?: NonNullable<AIReActChatProps['externalParameters']>['rightIcon']
}

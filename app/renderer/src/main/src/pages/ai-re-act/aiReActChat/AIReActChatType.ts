import { HandleStartParams } from '@/pages/ai-agent/aiAgentChat/type'
import { AIChatQSData } from '../hooks/aiRender'
import { AIInputEvent } from '../hooks/grpcApi'
import React from 'react'
import { AIChatTextareaProps, AIChatTextareaRefProps } from '@/pages/ai-agent/template/type'
import { YakitButtonProp } from '@/components/yakitUI/YakitButton/YakitButton'

export type DataDetailsButtonProps = Omit<YakitButtonProp, 'icon' | 'children'>

export interface AIReActChatRefProps extends AIChatTextareaRefProps {
  handleStart: (value: HandleStartParams) => void
}
export interface AIHandleStartParams {
  params: AIInputEvent
}
export interface AIHandleStartExtraProps {
  chatId?: string
}
export interface AIHandleStartResProps {
  params: AIInputEvent
  extraParams?: AIHandleStartExtraProps
  onChat?: () => void
  onChatFromHistory?: (sessionID: string) => void
}
export interface AISendParams {
  params: AIInputEvent
}
export interface AISendResProps {
  params: AIInputEvent
}

enum RightIconType {
  history = 'history',
  close = 'close',
  add = 'add',
  dataDetails = 'dataDetails',
  taskDetails = 'taskDetails',
}

type ExternalParametersRightIcon = Partial<{
  [RightIconType.history]: boolean
  [RightIconType.close]: React.ReactElement
  [RightIconType.add]: React.ReactElement
  [RightIconType.dataDetails]: true | DataDetailsButtonProps
  [RightIconType.taskDetails]: boolean
}>
export interface AIReActChatProps {
  chatContainerClassName?: string
  chatContainerHeaderClassName?: string
  showFreeChat: boolean
  setShowFreeChat: (show: boolean) => void
  title?: React.ReactNode
  ref?: React.ForwardedRef<AIReActChatRefProps>
  startRequest: (v: AIHandleStartParams) => Promise<AIHandleStartResProps>
  sendRequest?: (v: AISendParams) => Promise<AISendResProps>
  externalParameters?: {
    rightIcon?: ExternalParametersRightIcon
    isOpen?: boolean
    filterMentionType?: AIChatTextareaProps['filterMentionType']
    footerLeftTypes?: AIChatTextareaProps['footerLeftTypes']
    footerRightTypes?: AIChatTextareaProps['footerRightTypes']
    defaultValue?: string
    onHttpFlowRemove?: AIChatTextareaProps['onHttpFlowRemove']
    /** 发送问题后回调（如清空 history 表勾选） */
    onAfterSubmit?: () => void
  }
}

export interface AINotifyMessageProps {}
export interface AIReActLogProps {
  logs: AIChatQSData[]
  setLogVisible: (visible: boolean) => void
}

export interface AIReActTimelineMessageProps {
  message?: string
  loading: boolean
  setLoading: (loading: boolean) => void
}

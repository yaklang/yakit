import { YakitButtonProp } from '@/components/yakitUI/YakitButton/YakitButton'
import { ReactNode } from 'react'
import { AIStartParams } from '../hooks/grpcApi'

export interface AIReActTaskChatProps {
  setShowFreeChat: (show: boolean) => void
  setTimeLine: (show: boolean) => void
  /** 任务规划 tabs 是否有内容，用于外层自由对话变大 */
  onTaskTabsChange?: (hasTabs: boolean) => void
}

export interface AIReActTaskChatContentProps {
  scrollToBottom: boolean
  onScrollToBottom: () => void
}

export interface AIReActTaskChatLeftSideProps {
  leftExpand: boolean
  setLeftExpand: (v: boolean) => void
}
export interface AIRenderTaskFooterExtraProps {
  children?: ReactNode
  btnProps?: YakitButtonProp
  subTaskBtnProps?: YakitButtonProp
  onExtraAction: (type: 'stopTask' | 'stopSubTask' | 'recover', syncID: string) => void
}

export interface AIGlobalCommandPopoverProps {
  children?: ReactNode
  childrenClass?: string
}

export interface AIManualAdditionPopoverProps {
  children?: ReactNode
  visible?: boolean
  setVisible?: (v: boolean) => void
  chatType: AIManualAdditionProps['chatType']
}

export interface AIInputSettingPopoverProps {
  children?: ReactNode
  visible?: boolean
  setVisible?: (v: boolean) => void
}
export interface AIInputSettingFormProps extends Pick<AIStartParams, 'SyncPerceptionTrigger' | 'EnablePlan'> {}

export interface AIGlobalCommandRefProps {
  value: string
}
export interface AIGlobalCommandProps {
  ref?: React.ForwardedRef<AIGlobalCommandRefProps>
  onSave: (v: string) => void
  onCancel: () => void
}

export interface AIPlanPromptPopoverProps {
  children?: ReactNode
  childrenClass?: string
}

export interface AIPlanPromptRefProps {
  value: string
}

export interface AIPlanPromptProps {
  ref?: React.ForwardedRef<AIPlanPromptRefProps>
  onSave: (v: string) => void
  onCancel: () => void
}

export interface AIManualAdditionProps {
  chatType: ReActChatBaseInfo['chatType']
  onCancel: () => void
}

import { YakitButtonProp } from '@/components/yakitUI/YakitButton/YakitButton'
import { AIRecommendItem } from '@/pages/ai-agent/aiChatWelcome/type'
import { ReactNode } from 'react'

export interface AIReActTaskChatProps {
  setShowFreeChat: (show: boolean) => void
  setTimeLine: (show: boolean) => void
}

export interface AIReActTaskChatContentProps {}

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

export interface AIReActTaskRecommendProps {
  title: string
  data: AIRecommendItem[]
  onClickItem: (item: AIRecommendItem) => void
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

export interface AIGlobalCommandRefProps {
  value: string
}
export interface AIGlobalCommandProps {
  ref?: React.ForwardedRef<AIGlobalCommandRefProps>
  onSave: (v: string) => void
  onCancel: () => void
}

export interface AIManualAdditionProps {
  chatType: ReActChatBaseInfo['chatType']
  onCancel: () => void
}

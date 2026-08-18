import type { ReactNode } from 'react'
import type { ChatListRenderType } from '../hooks/aiRender'

export interface AIReActTaskChatProps {
  setShowFreeChat: (show: boolean) => void
  setTimeLine: (show: boolean) => void
  /** @deprecated 任务规划 tabs 是否有内容，用于外层自由对话变大 */
  // onTaskTabsChange?: (hasTabs: boolean) => void
}

export interface AIReActTaskChatLeftSideProps {
  leftExpand: boolean
  setLeftExpand: (v: boolean) => void
}

export interface AIInputSettingPopoverProps {
  children?: ReactNode
  visible?: boolean
  setVisible?: (v: boolean) => void
}
export interface AIInputSettingFormProps {
  SyncPerceptionTrigger: boolean
  EnablePlan: boolean
  /** 全局指令 */
  AIPresetPrompt: string
  /** 规划提示词 */
  AIPlanPrompt: string
}

export interface AIManualAdditionPopoverProps {
  children?: ReactNode
  visible?: boolean
  setVisible?: (v: boolean) => void
  chatType: AIManualAdditionProps['chatType']
}

export interface AIManualAdditionProps {
  chatType: ChatListRenderType
  onCancel: () => void
}

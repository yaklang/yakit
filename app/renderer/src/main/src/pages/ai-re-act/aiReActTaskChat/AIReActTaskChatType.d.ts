import type { ReactNode } from 'react'

export interface AIReActTaskChatProps {
  setShowFreeChat: (show: boolean) => void
  setTimeLine: (show: boolean) => void
  onTaskTabsChange?: (hasTabs: boolean) => void
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

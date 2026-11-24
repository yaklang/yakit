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
  AllowUserPrompt: boolean
  SyncPerceptionTrigger: boolean
  EnablePlan: boolean
  SingleModelMode: boolean
  /** 启用命令执行安全规则（UI 正向语义，落库为 DisableBuiltinSyntaxFlowRules） */
  EnableCommandSecurityRules: boolean
  /** 全局指令 */
  AIPresetPrompt: string
  /** 规划提示词 */
  AIPlanPrompt: string
}

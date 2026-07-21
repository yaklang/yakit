import { Dispatch, SetStateAction } from 'react'
import { AISession } from './type/aiChat'
import { AITabsEnum } from './defaultConstant'
import { AIStartParams } from '../ai-re-act/hooks/grpcApi'
import type { PlanLoadingStatus } from '../ai-re-act/hooks/type'
export interface AIAgentProps {
  pageId: string
}

// #region 页面全局变量
// 全局配置信息
export interface AIAgentSetting extends Omit<
  AIStartParams,
  'CoordinatorId' | 'Sequence' | 'McpServers' | 'UserQuery'
> {}

// 触发事件通信
export interface AIAgentTriggerEventInfo {
  type: string
  params?: Record<string, any>
  // 是否直接使用所传forge
  useForge?: boolean
}
// #endregion

// #region UI左侧组件定义
export interface AIAgentSideListProps {
  show: boolean
  setShow: (s: boolean) => void
}

// 编辑对话名字
export interface EditChatNameModalProps {
  getContainer?: HTMLElement
  zIndex?: number
  info: AISession
  visible: boolean
  onCallback: (result: boolean, info?: AISession) => void
}

// #region UI右侧组件定义
// 对话框左侧侧边栏
export interface AIChatLeftSideProps {
  expand: boolean
  setExpand: Dispatch<SetStateAction<boolean>>
}

// 对话框回答
export type AITabsEnumType = `${AITabsEnum}`

export interface AIAgentChatStreamProps {
  defaultExpand?: boolean
  scrollToBottom: boolean
  taskStatus: PlanLoadingStatus
}

// #endregion

//#region AI工具查看详情
export interface AIChatToolDrawerContentProps {
  callToolId: string
  aiFilePath?: string
}
// #endregion

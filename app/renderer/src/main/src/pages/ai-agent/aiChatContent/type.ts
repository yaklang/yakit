import type { AIReActChatRefProps } from '@/pages/ai-re-act/aiReActChat/AIReActChatType'
import { type AITabsEnum } from '../defaultConstant'

export interface AIChatContentRefProps extends AIReActChatRefProps {}
export interface AIChatContentProps {
  ref?: React.ForwardedRef<AIChatContentRefProps>
  /** 发起新会话后的回调，用于切换到自由对话模式。 */
  onChat: () => void
  /** 输入框删除流量引用时触发，用于取消对应的表格勾选。 */
  onHttpFlowRemove?: (id: string, isSummary: boolean) => void
  /** 提交消息并清空输入内容后触发，用于清理流量勾选和引用。 */
  onAfterSubmit?: () => void
  showFreeChat?: boolean
  setShowFreeChat?: (visible: boolean) => void
  /** 提供聊天布局容器供外部定位右侧面板；传入后不再渲染内置右侧面板。 */
  rightPanelLayoutRef?: React.RefCallback<HTMLDivElement>
}
/** 文件预览高亮区间（Monaco 1-based 行列，endColumn 不含） */
export interface AIAgentFilePreviewHighlight {
  startLineNumber: number
  startColumn: number
  endLineNumber: number
  endColumn: number
}

export interface AIAgentTabPayload {
  key: AITabsEnum
  value?: string
  /** File_Preview：打开时定位并高亮的命中区间 */
  highlights?: AIAgentFilePreviewHighlight[]
}

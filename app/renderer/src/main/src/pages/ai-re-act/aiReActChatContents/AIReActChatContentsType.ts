import type { ForwardedRef } from 'react'
import type { ChatStream } from '../hooks/aiRender'

export interface AIReActChatContentsPProps {
  ref: ForwardedRef<AIReActChatContentsRef>
}

export interface AIReActChatContentsRef {
  scrollToItemIndex: (arrayIndex: number, behavior?: 'auto' | 'smooth') => void
}

export interface AIStreamNodeProps {
  stream: ChatStream
  aiMarkdownProps?: { className: string }
  /** 当前流所在列表项在 `chats.elements` 中的下标（用于 WebFuzzer 自动改包防覆盖） */
  listItemIndex?: number
  /** 当前 ReAct 的 SessionID */
  streamChatSessionId?: string
}

export interface AIReferenceNodeProps {
  /** 参考资料 token 列表（payload 存 IDB，完整弹框交互后置） */
  referenceList: string[]
  className?: string
}

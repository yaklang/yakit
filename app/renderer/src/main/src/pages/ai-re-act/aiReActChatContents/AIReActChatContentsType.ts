import type { ChatReferenceMaterialPayload, ChatStream } from '../hooks/aiRender'

export interface AIReActChatContentsPProps {}

export interface AIStreamNodeProps {
  stream: ChatStream
  aiMarkdownProps?: { className: string }
  /** 当前流所在列表项在 `chats.elements` 中的下标（用于 WebFuzzer 自动改包防覆盖） */
  listItemIndex?: number
  /** 当前 ReAct 的 SessionID */
  streamChatSessionId?: string
}

export interface AIReferenceNodeProps {
  referenceList: ChatReferenceMaterialPayload
  className?: string
}

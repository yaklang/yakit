import type {ChatReferenceMaterialPayload, ChatStream} from "../hooks/aiRender"
import type {UseCasualChatState} from "../hooks/type"

export interface AIReActChatContentsPProps {
    chats: UseCasualChatState
}

export interface AIStreamNodeProps {
    stream: ChatStream
    aiMarkdownProps?: {className: string}
}

export interface AIReferenceNodeProps {
    referenceList: ChatReferenceMaterialPayload
    className?: string
}

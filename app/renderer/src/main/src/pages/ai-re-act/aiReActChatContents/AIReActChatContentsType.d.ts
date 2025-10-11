import {AIChatQSData} from "../hooks/aiRender"

export interface AIReActChatContentsPProps {
    chats: AIChatQSData[]
}

export interface AIStreamChatContentProps {
    stream: string
    nodeLabel: string
}

export interface AIMarkdownProps extends AIStreamChatContentProps {
    className?: string
}

export interface TaskUpdateNoticeProps {}

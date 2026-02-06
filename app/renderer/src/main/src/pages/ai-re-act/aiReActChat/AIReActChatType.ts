import {AIAgentChatMode, HandleStartParams} from "@/pages/ai-agent/aiAgentChat/type"
import {AIChatQSData} from "../hooks/aiRender"
import {AIInputEvent} from "../hooks/grpcApi"
import React, {ReactNode} from "react"
import {AIChatTextareaRefProps} from "@/pages/ai-agent/template/type"
import {iconMapType} from "@/pages/ai-agent/components/aiChatMention/type"

export interface AIReActChatRefProps extends AIChatTextareaRefProps {
    handleStart: (value: HandleStartParams) => void
}
export interface AIHandleStartParams {
    params: AIInputEvent
}
export interface AIHandleStartExtraProps {
    chatId?: string
}
export interface AIHandleStartResProps {
    params: AIInputEvent
    extraParams?: AIHandleStartExtraProps
    onChat?: () => void
    onChatFromHistory?: (sessionID: string) => void
}
export interface AISendParams {
    params: AIInputEvent
}
export interface AISendResProps {
    params: AIInputEvent
}
export interface AIReActChatProps {
    mode: AIAgentChatMode
    chatContainerClassName?: string
    chatContainerHeaderClassName?: string
    showFreeChat: boolean
    setShowFreeChat: (show: boolean) => void
    title?: React.ReactNode
    ref?: React.ForwardedRef<AIReActChatRefProps>
    startRequest: (v: AIHandleStartParams) => Promise<AIHandleStartResProps>
    sendRequest?: (v: AISendParams) => Promise<AISendResProps>
    externalParameters?: {
        rightIcon?: string | React.ReactNode
        isOpen?: boolean
        defaultAIFocusMode?: {
            children: ReactNode
            filterMode?: iconMapType[]
        }
    }
}

export interface AIReActLogProps {
    logs: AIChatQSData[]
    setLogVisible: (visible: boolean) => void
}

export interface AIReActTimelineMessageProps {
    message?: string
    loading: boolean
    setLoading: (loading: boolean) => void
}

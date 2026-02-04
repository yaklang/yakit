import {useCallback, useRef, useState} from "react"
import {ChatStream, ReActChatRenderItem} from "@/pages/ai-re-act/hooks/aiRender"
import {aiChatDataStore} from "@/pages/ai-agent/store/ChatDataStore"
import {useRafPolling} from "@/hook/useRafPolling/useRafPolling"

export interface UseStreamingChatContentParams {
    chatType: ReActChatRenderItem["chatType"]
    token: string
    session: string
}

export interface UseStreamingChatContentResult {
    /** 流数据 */
    stream: ChatStream | null
    /** 是否需要打字效果（经历过 start 状态） */
    shouldType: boolean
}

export function useStreamingChatContent(params: UseStreamingChatContentParams): UseStreamingChatContentResult {
    const {chatType, token, session} = params

    const hasStartedRef = useRef<boolean>(false)
    const [shouldType, setShouldType] = useState<boolean>(false)

    const getData = useCallback((): ChatStream | null => {
        return aiChatDataStore.getContentMap({session, chatType, mapKey: token}) as ChatStream
    }, [chatType, token, session])

    const stream = useRafPolling<ChatStream>({
        getData,
        interval: 200,
        shouldStop: (data) => {
            if (data.data.status === "start") {
                hasStartedRef.current = true
                setShouldType(true)
            }
            return data.data.status === "end"
        },
        shouldUpdate: (prev, next) => {
            if (!prev) return true
            return prev.data.content !== next.data.content || prev.data.status !== next.data.status
        }
    })
    return {stream, shouldType}
}

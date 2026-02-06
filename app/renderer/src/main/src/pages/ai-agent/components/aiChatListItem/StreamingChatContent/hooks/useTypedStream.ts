// hooks/useTypedStream.ts
import {useMemo} from "react"
import {ChatStream, ReActChatRenderItem} from "@/pages/ai-re-act/hooks/aiRender"
import {useStreamingTypewriter} from "./useStreamingTypewriter"
import {useStreamingChatContent} from "./useStreamingChatContent"

export interface UseTypedStreamOptions {
    chatType: ReActChatRenderItem["chatType"]
    token: string
    /** 每次输出的字符数，默认 3（更快更流畅） */
    step?: number
    /** 打字间隔时间（毫秒），默认 20（稍慢一点，更自然） */
    interval?: number
}

export interface UseTypedStreamResult {
    /** 处理后的流数据 */
    stream: ChatStream | null
    /** 是否正在打字 */
    isTyping: boolean
}

/**
 * 获取流式聊天内容并应用平滑打字效果
 * - 实时流式（start → end）：启用打字效果
 * - 历史记录（直接 end）：禁用打字效果，直接显示
 */
export function useTypedStream(options: UseTypedStreamOptions): UseTypedStreamResult {
    const {chatType, token, step = 3, interval = 20} = options

    // 获取流数据和是否需要打字效果
    const {stream: rawStream, shouldType} = useStreamingChatContent({chatType, token})

    const content = rawStream?.data?.content || ""

    // 平滑流式输出：将后端大块推送的内容逐字显示
    const {displayedContent, isTyping} = useStreamingTypewriter(content, {
        step,
        interval,
        enabled: shouldType
    })

    const stream = useMemo(() => {
        if (!rawStream) return null

        // 如果禁用打字效果，直接返回原始流
        if (!shouldType) return rawStream

        return {
            ...rawStream,
            data: {
                ...rawStream.data,
                content: displayedContent,
                // 如果正在打字，保持 start 状态；否则使用原始状态
                status: isTyping ? "start" : rawStream.data.status
            }
        }
    }, [rawStream, displayedContent, shouldType, isTyping])

    return {stream, isTyping}
}
// hooks/useTypedStream.ts
import { useMemo } from 'react'
import { ChatStream, ReActChatRenderItem } from '@/pages/ai-re-act/hooks/aiRender'
import { useStreamingTypewriter } from './useStreamingTypewriter'
import { useStreamingChatContent } from './useStreamingChatContent'

export interface UseTypedStreamOptions {
  chatType: ReActChatRenderItem['chatType']
  token: string
  session: string
  /** 每次输出的字符数，默认 6（更快更流畅） */
  step?: number
  /** 打字间隔时间（毫秒），默认 35（稍慢一点，更自然） */
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
  const { chatType, token, session, step = 6, interval = 35 } = options

  // 获取流数据和是否需要打字效果
  const { renderNumber, stream: rawStream, shouldType } = useStreamingChatContent({ chatType, token, session })

  const content = rawStream?.data?.content || ''
  // 后端流是否已结束。结束后必须保证最终渲染的是真实完整内容，不能被打字机中间状态污染
  const isFinished = rawStream?.data?.status === 'end'

  // 平滑流式输出：将后端大块推送的内容逐字显示
  const { displayedContent, isTyping } = useStreamingTypewriter(content, {
    step,
    interval,
    enabled: shouldType,
    finished: isFinished,
  })

  const stream = useMemo(() => {
    if (!rawStream) return null

    // 如果禁用打字效果，直接返回原始流
    if (!shouldType) return rawStream

    // 流已结束：直接使用原始完整内容与原始状态，确保不被打字机截断状态污染
    if (isFinished) {
      return {
        ...rawStream,
        data: {
          ...rawStream.data,
          content,
        },
      }
    }

    return {
      ...rawStream,
      data: {
        ...rawStream.data,
        content: displayedContent,
        // 如果正在打字，保持 start 状态；否则使用原始状态
        status: isTyping ? 'start' : rawStream.data.status,
      },
    }
  }, [renderNumber, rawStream, content, displayedContent, shouldType, isTyping, isFinished])

  return { stream, isTyping }
}

// hooks/useTypedStream.ts
import { useMemo } from 'react'
import { ChatStream } from '@/pages/ai-re-act/hooks/aiRender'
import { useStreamingTypewriter } from './useStreamingTypewriter'
import { useStreamingChatContent } from './useStreamingChatContent'

export interface UseTypedStreamOptions {
  token: string
  /** 单步最小输出字符数（下限），默认 2 */
  step?: number
  /** 单步最大输出字符数（上限，保证每次渲染长度不会突然过大），默认 18 */
  maxStep?: number
  /** 打字间隔时间（毫秒，每次渲染间隔），默认 30（约 33fps，平滑且开销可控） */
  interval?: number
  /**
   * 目标排空帧数，默认 9。
   * catchUpFrames * interval ≈ 270ms，接近后端 300ms 轮询间隔，
   * 让每批数据连续地铺满到下一批到来，消除"卡一会→突然输出一大段"的卡顿。
   */
  catchUpFrames?: number
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
 * TODO - 优化: 看这个hooks是否需要改成只传content(显示在页面的数据)内容出去，其余的值通过useCurrentRawData获取
 */
export function useTypedStream(options: UseTypedStreamOptions): UseTypedStreamResult {
  const { token, step = 2, maxStep = 18, interval = 30, catchUpFrames = 9 } = options

  // 获取流数据和是否需要打字效果
  const { renderNumber, stream: rawStream, shouldType } = useStreamingChatContent({ token })

  const content = rawStream?.data?.content || ''
  // 后端流是否已结束。结束后必须保证最终渲染的是真实完整内容，不能被打字机中间状态污染
  const isFinished = rawStream?.data?.status === 'end'

  // 平滑流式输出：将后端大块推送的内容逐字显示
  const { displayedContent, isTyping } = useStreamingTypewriter(content, {
    step,
    maxStep,
    interval,
    catchUpFrames,
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

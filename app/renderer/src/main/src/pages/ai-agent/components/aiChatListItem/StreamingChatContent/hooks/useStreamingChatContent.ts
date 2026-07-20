import { useCallback, useRef, useState } from 'react'
import { ChatStream } from '@/pages/ai-re-act/hooks/aiRender'
import { useRafPolling } from '@/hook/useRafPolling/useRafPolling'
import { useCurrentRawData } from '@/pages/ai-re-act/hooks/useCurrentDataBySession'

export interface UseStreamingChatContentParams {
  token: string
}

export interface UseStreamingChatContentResult {
  /** 流数据（原始引用，供需要 reference / selectors 等字段的调用方使用） */
  stream: ChatStream | null
  /** 是否需要打字效果（经历过 start 状态） */
  shouldType: boolean
  /** 后端流是否已结束。结束后必须保证最终渲染的是真实完整内容，不能被打字机中间状态污染 */
  isFinished: boolean
  /** 用于页面显示的最新 content（已通过轮询从 rawData 捞出，无需调用方再读 stream.data.content） */
  content: string
}

/**
 * 获取流式聊天内容并维护打字所需的状态语义。
 *
 * 后端正常流式 chunk 不会 bump renderNum（见 aiStream.ts 的 handleStream），
 * 而是直接原地累加 data.content，React 无法感知，因此这里用 useRafPolling 周期性
 * 从 rawData.contents 重新读取最新内容，直到 status === 'end' 停止轮询。
 *
 * 本 hook 只负责"取数 + 状态语义化"，打字平滑效果由 useStreamingTypewriter 负责。
 */
export function useStreamingChatContent(params: UseStreamingChatContentParams): UseStreamingChatContentResult {
  const { token } = params

  const rawData = useCurrentRawData()

  const hasStartedRef = useRef<boolean>(false)
  const [shouldType, setShouldType] = useState<boolean>(false)

  // 关键：后端 stream chunk 是对 rawData.contents 中的"同一个对象引用"做原地累加
  // （见 aiStream.ts 的 handleStream：streamData.data.content += content），引用永远不变。
  // 若不 clone，shouldUpdate 比较的是同一个对象，prev.data.content === next.data.content 恒为 true，
  // 轮询永远检测不到内容增长 → 不会触发重渲染 → 打字机吃不到后续批次 → 平滑效果失效。
  // 这里通过 clone 拍下快照，让 shouldUpdate 按值比较 content/status 字符串，从而正确感知增量。
  const cloneStream = useCallback((chatStreamItem: ChatStream): ChatStream => {
    return {
      ...chatStreamItem,
      data: { ...chatStreamItem.data },
      reference: chatStreamItem.reference ? [...chatStreamItem.reference] : undefined,
    }
  }, [])

  const { aiDataRef } = useRafPolling<ChatStream>({
    getData: () => {
      const item = rawData.contents.get(token) as ChatStream
      return item
    },
    interval: 300,
    clone: cloneStream,
    shouldStop: (data) => {
      if (data.data.status === 'start') {
        hasStartedRef.current = true
        setShouldType(true)
      }
      return data.data.status === 'end'
    },
    shouldUpdate: (prev, next) => {
      if (!prev) return true
      return prev.data.content !== next.data.content || prev.data.status !== next.data.status
    },
  })

  const stream = aiDataRef
  const content = stream?.data?.content || ''
  const isFinished = stream?.data?.status === 'end'

  return { stream, shouldType, isFinished, content }
}

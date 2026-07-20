import { useRef, useState } from 'react'
import { ChatStream } from '@/pages/ai-re-act/hooks/aiRender'
import { useRafPolling } from '@/hook/useRafPolling/useRafPolling'
import { useCurrentRawData, useCurrentStore } from '@/pages/ai-re-act/hooks/useCurrentDataBySession'
import { useStore } from 'zustand'

export interface UseStreamingChatContentParams {
  token: string
}

export interface UseStreamingChatContentResult {
  /**渲染 */
  renderNumber: number
  /** 流数据 */
  stream: ChatStream | null
  /** 是否需要打字效果（经历过 start 状态） */
  shouldType: boolean
}

export function useStreamingChatContent(params: UseStreamingChatContentParams): UseStreamingChatContentResult {
  const { token } = params

  const store = useCurrentStore()
  const rawData = useCurrentRawData()

  const tokenRenderNum = useStore(store, (state) => state.items[token]?.renderNum)

  const hasStartedRef = useRef<boolean>(false)
  const [shouldType, setShouldType] = useState<boolean>(false)

  // const getData = useCallback((): ChatStream | null => {
  //   return rawData.contents.get(token) as ChatStream
  // }, [tokenRenderNum])

  const { renderNumber, aiDataRef } = useRafPolling<ChatStream>({
    getData: () => {
      return rawData.contents.get(token) as ChatStream
    },
    interval: 300,
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
  return { renderNumber, stream: aiDataRef, shouldType }
}

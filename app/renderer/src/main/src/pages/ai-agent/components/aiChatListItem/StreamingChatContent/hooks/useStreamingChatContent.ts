import { useCallback, useRef, useState } from "react"
import {useRafInterval} from "ahooks"
import useAIChatUIData from "@/pages/ai-re-act/hooks/useAIChatUIData"
import { ChatStream, ReActChatRenderItem } from "@/pages/ai-re-act/hooks/aiRender"

export interface UseStreamingChatContentParams {
  chatType:  ReActChatRenderItem['chatType']
  token: string
}

export interface UseStreamingChatContentResult {
  /** 流数据 */
  stream: ChatStream | null
  /** 是否需要打字效果（经历过 start 状态） */
  shouldType: boolean
}

export function useStreamingChatContent(
  params: UseStreamingChatContentParams
): UseStreamingChatContentResult {
  const { chatType, token } = params
  const { getChatContentMap } = useAIChatUIData()

  const getChatContent = useCallback((): ChatStream | null => {
    if (!getChatContentMap) return null
    return getChatContentMap(chatType, token) as ChatStream
  }, [chatType, token, getChatContentMap])

  const [renderData, setRenderData] = useState<ChatStream | null>(
    getChatContent()
  )

  const isRunningRef = useRef<boolean>(true)
  // 记录是否经历过 start 状态
  const hasStartedRef = useRef<boolean>(false)
  const [shouldType, setShouldType] = useState<boolean>(false)

  useRafInterval(
    () => {
      const chatItem = getChatContent()
      if (!chatItem) return

      const status = chatItem.data.status

      if (status === "start") {
        if (!hasStartedRef.current) {
          hasStartedRef.current = true
          setShouldType(true)
        }
        isRunningRef.current = true
        setRenderData(chatItem)
        return
      }

      if (status === "end") {
        setRenderData(chatItem)
        isRunningRef.current = false
      }
    },
    isRunningRef.current ? 200 : undefined
  )

  return { stream: renderData, shouldType }
}

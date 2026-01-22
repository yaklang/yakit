import { useCallback, useRef, useState } from "react"
import {useRafInterval} from "ahooks"
import useAIChatUIData from "@/pages/ai-re-act/hooks/useAIChatUIData"
import { ChatStream, ReActChatRenderItem } from "@/pages/ai-re-act/hooks/aiRender"

export interface UseStreamingChatContentParams {
  chatType:  ReActChatRenderItem['chatType']
  token: string
}

export function useStreamingChatContent(
  params: UseStreamingChatContentParams
): ChatStream | null {
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

  useRafInterval(
    () => {
      const chatItem = getChatContent()
      if (!chatItem) return

      const status = chatItem.data.status

      if (status === "start") {
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

  return renderData
}

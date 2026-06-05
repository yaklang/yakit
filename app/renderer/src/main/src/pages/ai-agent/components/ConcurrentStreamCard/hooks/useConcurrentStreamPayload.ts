import { useMemo } from 'react'
import useChatIPCDispatcher from '../../../useContext/ChatIPCContent/useDispatcher'
import type { AIChatQSData, ReActChatElement, ReActChatTaskElementSub } from '@/pages/ai-re-act/hooks/aiRender'

export interface ConcurrentStreamChildWindowPayload {
  session: string
  token: string
  chatType: ReActChatElement['chatType']
  elements: ReActChatTaskElementSub[]
  contentEntries: Array<[string, AIChatQSData]>
}

interface UseConcurrentStreamPayloadOptions {
  session: string
  token: string
  chatType: ReActChatElement['chatType']
  elements: ReActChatTaskElementSub[]
}

/** 收集当前任务及子节点内容，供新窗口打开使用 */
export function useConcurrentStreamPayload({
  session,
  token,
  chatType,
  elements,
}: UseConcurrentStreamPayloadOptions): ConcurrentStreamChildWindowPayload {
  const { fetchChatDataStore } = useChatIPCDispatcher().chatIPCEvents

  return useMemo(() => {
    const store = fetchChatDataStore()
    const contentEntries: Array<[string, AIChatQSData]> = []

    const rootContent = store?.getContentMap({ session, chatType, mapKey: token })
    if (rootContent) {
      contentEntries.push([token, rootContent])
    }

    const collectEntries = (items: ReActChatTaskElementSub[]) => {
      items.forEach((item) => {
        const content = store?.getContentMap({
          session,
          chatType: item.chatType,
          mapKey: item.token,
        })

        if (content) {
          contentEntries.push([item.token, content])
        }

        if (item.kind === 'group') {
          collectEntries(item.children)
        }
      })
    }

    collectEntries(elements)

    return { session, token, chatType, elements, contentEntries }
  }, [chatType, elements, fetchChatDataStore, session, token])
}

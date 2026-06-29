import { cloneDeep } from 'lodash'
import {
  defaultDispatcherOfChatIPC,
  type ChatIPCContextValue,
} from '@/pages/ai-agent/useContext/ChatIPCContent/ChatIPCContent'
import { defaultChatIPCData } from '@/pages/ai-agent/defaultConstant'
import { ChatDataStore } from '@/pages/ai-agent/store/ChatDataStore'
import type { AIChatQSData } from '@/pages/ai-re-act/hooks/aiRender'
import type { ConcurrentStreamFramePayload } from '@/pages/ai-agent/components/ConcurrentStreamCard/concurrentStreamFrame'

export function buildConcurrentStreamContext({
  session,
  contentEntries,
}: ConcurrentStreamFramePayload & {
  contentEntries: Array<[string, AIChatQSData]>
}): ChatIPCContextValue {
  const chatDataStore = new ChatDataStore()
  chatDataStore.create(session)

  contentEntries.forEach(([mapKey, content]) => {
    const chatData = chatDataStore.get(session)
    if (!chatData) return
    if (content.chatType === 'task') {
      chatData.taskChat.contents.set(mapKey, content)
    } else {
      chatData.casualChat.contents.set(mapKey, content)
    }
  })

  return {
    store: {
      chatIPCData: cloneDeep(defaultChatIPCData),
      reviewInfo: undefined,
      planReviewTreeKeywordsMap: new Map(),
    },
    dispatcher: {
      ...defaultDispatcherOfChatIPC,
      chatIPCEvents: {
        ...defaultDispatcherOfChatIPC.chatIPCEvents,
        fetchChatDataStore: () => chatDataStore,
      },
    },
  }
}

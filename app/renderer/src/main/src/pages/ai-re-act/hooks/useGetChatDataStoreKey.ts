import { useCreation } from 'ahooks'
import useChatIPCDispatcher from '@/pages/ai-agent/useContext/ChatIPCContent/useDispatcher'
import {
  ChatDataStoreKey,
  histroyAiStore,
  FlowAiStore,
  aiChatDataStore,
  knowledgeBaseDataStore,
  WebFuzzerAiStore,
} from '@/pages/ai-agent/store/ChatDataStore'

function useGetChatDataStoreKey() {
  const { chatIPCEvents } = useChatIPCDispatcher()
  const chatDataStoreKey = useCreation((): ChatDataStoreKey => {
    const store = chatIPCEvents.fetchChatDataStore()
    switch (store) {
      case histroyAiStore:
        return 'histroyAiStore'
      case FlowAiStore:
        return 'FlowAiStore'
      case aiChatDataStore:
        return 'aiChatDataStore'
      case knowledgeBaseDataStore:
        return 'knowledgeBaseDataStore'
      default:
        if (store instanceof WebFuzzerAiStore) return 'WebFuzzerAiStore'
        return 'unknown'
    }
  }, [chatIPCEvents])
  return { chatDataStoreKey } as const
}

export default useGetChatDataStoreKey

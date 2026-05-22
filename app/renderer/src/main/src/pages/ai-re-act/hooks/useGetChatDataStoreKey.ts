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
import type { AISource } from './grpcApi'

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

export const getAISourceFromChatDataStoreKey = (key: ChatDataStoreKey): AISource | undefined => {
  switch (key) {
    case 'histroyAiStore':
      return 'history'
    case 'FlowAiStore':
      return 'flow'
    case 'aiChatDataStore':
      return 'ai'
    case 'knowledgeBaseDataStore':
      return 'knowledgeBase'
    case 'WebFuzzerAiStore':
      return 'webFuzzer'
    default:
      return undefined
  }
}

export default useGetChatDataStoreKey

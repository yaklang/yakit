import { useCreation } from 'ahooks'
import useChatIPCDispatcher from '@/pages/ai-agent/useContext/ChatIPCContent/useDispatcher'
import {
  ChatDataStore,
  ChatDataStoreKey,
  histroyAiStore,
  FlowAiStore,
  aiChatDataStore,
  knowledgeBaseDataStore,
  WebFuzzerAiStore,
  irifyAiCodeAuditPageAiStore,
  yakRunnerPageAiStore,
} from '@/pages/ai-agent/store/ChatDataStore'
import type { Domain } from '@/pages/ai-agent/store/constants'
import type { AISource } from './grpcApi'

export const getChatDataStoreKey = (store?: ChatDataStore): ChatDataStoreKey => {
  switch (store) {
    case histroyAiStore:
      return 'histroyAiStore'
    case FlowAiStore:
      return 'FlowAiStore'
    case aiChatDataStore:
      return 'aiChatDataStore'
    case knowledgeBaseDataStore:
      return 'knowledgeBaseDataStore'
    case irifyAiCodeAuditPageAiStore:
      return 'irifyAiCodeAuditPageAiStore'
    case yakRunnerPageAiStore:
      return 'yakRunnerPageAiStore'
    default:
      if (store instanceof WebFuzzerAiStore) return 'WebFuzzerAiStore'
      return 'unknown'
  }
}

function useGetChatDataStoreKey() {
  const { chatIPCEvents } = useChatIPCDispatcher()
  const chatDataStoreKey = useCreation((): ChatDataStoreKey => {
    return getChatDataStoreKey(chatIPCEvents.fetchChatDataStore())
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
    case 'irifyAiCodeAuditPageAiStore':
      return 'irify'
    case 'yakRunnerPageAiStore':
      return 'yakRunner'
    default:
      return undefined
  }
}

/** AISource 映射到 IndexedDB 消息存储域（空 source 兼容老数据，归入 ai 域；im 归入 ai 域复用） */
export const getDomainFromAISource = (source?: AISource): Domain => {
  if (!source) return 'ai'
  if (source === 'im') return 'ai'
  return source as Domain
}

/** AI Agent 侧栏历史会话：包含 ai、im 来源与兼容老数据的空 source */
export const AI_AGENT_HISTORY_AI_SOURCES: AISource[] = ['ai', 'im', '']

/** 各业务页嵌入历史会话：仅查询对应单一 source */
export const getAISourceListFromChatDataStoreKey = (key: ChatDataStoreKey): AISource[] => {
  const source = getAISourceFromChatDataStoreKey(key)
  return source ? [source] : []
}

export default useGetChatDataStoreKey

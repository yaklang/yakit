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
import { AISourceEnum, type AISource } from './grpcApi'
import useAIAgentStore from '@/pages/ai-agent/useContext/useStore'
import { useCreation } from 'ahooks'

function useGetChatDataStoreKey() {
  const { setting } = useAIAgentStore()
  const chatDataStoreKey: ChatDataStoreKey = useCreation(() => {
    return getImageStoreKeyByAISource(setting.Source || 'ai')
  }, [setting.Source])
  return chatDataStoreKey
}

export default useGetChatDataStoreKey
/**
 * 根据后端返回的会话数据来源转换为前端对应的数据存储路径key
 */
export const getImageStoreKeyByAISource = (source: AISource): ChatDataStoreKey => {
  switch (source) {
    case AISourceEnum.aiAgent:
    case AISourceEnum.other:
    case AISourceEnum.im:
      return 'aiChatDataStore'
    case AISourceEnum.history:
      return 'histroyAiStore'
    case AISourceEnum.flow:
      return 'FlowAiStore'
    case AISourceEnum.knowledgeBase:
      return 'knowledgeBaseDataStore'
    case AISourceEnum.webFuzzer:
      return 'WebFuzzerAiStore'
    case AISourceEnum.irify:
      return 'irifyAiCodeAuditPageAiStore'
    case AISourceEnum.yakRunner:
      return 'yakRunnerPageAiStore'
    default:
      return 'unknown'
  }
}

/**
 * TODO - 待验证是否还需要此方法
 */
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

/**
 * TODO - 待验证是否还需要此方法
 */
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

/**
 * TODO - 待验证是否还需要此方法
 */
/** AISource 映射到 IndexedDB 消息存储域（空 source 兼容老数据，归入 ai 域；im 归入 ai 域复用） */
export const getDomainFromAISource = (source?: AISource): Domain => {
  if (!source) return 'ai'
  if (source === 'im') return 'ai'
  return source as Domain
}

/** AI Agent 侧栏历史会话：包含 ai、im 来源与兼容老数据的空 source */
export const AI_AGENT_HISTORY_AI_SOURCES: AISource[] = ['ai', 'im', '']

/**
 * TODO - 待验证是否还需要此方法
 */
/** 各业务页嵌入历史会话：仅查询对应单一 source */
export const getAISourceListFromChatDataStoreKey = (key: ChatDataStoreKey): AISource[] => {
  const source = getAISourceFromChatDataStoreKey(key)
  return source ? [source] : []
}

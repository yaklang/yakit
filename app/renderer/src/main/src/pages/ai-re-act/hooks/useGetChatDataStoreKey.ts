import { ChatDataStoreKey } from '@/pages/ai-agent/store/ChatDataStore'
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

/** AI Agent 侧栏历史会话：包含 ai、im 来源与兼容老数据的空 source */
export const AI_AGENT_HISTORY_AI_SOURCES: AISource[] = ['ai', 'im', '']

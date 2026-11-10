import { useContext } from 'react'
import AIAgentContext from '@/pages/ai-agent/useContext/AIAgentContext'

/**
 * @description 获取当前会话的 SessionID
 * @returns {string} 正式会话或欢迎页预分配的 SessionID
 */
function useCurrentSessionId() {
  const store = useContext(AIAgentContext).store
  const sessionId = store.activeChat?.SessionID || ''
  return sessionId
}

export default useCurrentSessionId

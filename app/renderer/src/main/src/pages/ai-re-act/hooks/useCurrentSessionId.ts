import { useContext } from 'react'
import AIAgentContext from '@/pages/ai-agent/useContext/AIAgentContext'

/**
 * @description 获取当前会话的 SessionID
 * @returns {string} 当前会话的 SessionID，如果没有则返回空字符串
 */
function useCurrentSessionId() {
  const sessionId = useContext(AIAgentContext)?.store?.activeChat?.SessionID || ''
  return sessionId
}

export default useCurrentSessionId

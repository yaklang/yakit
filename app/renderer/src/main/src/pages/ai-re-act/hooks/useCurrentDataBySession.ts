import useAIAgentStore from '@/pages/ai-agent/useContext/useStore'
import { globalSessionEngine } from './ChatMultiSessionController'
import useCurrentSessionId from './useCurrentSessionId'

/**
 * @description 获取当前会话的数据
 */
function useCurrentDataBySession() {
  const sessionId = useCurrentSessionId()
  const { pendingChat } = useAIAgentStore()
  return pendingChat?.data ?? globalSessionEngine.ensureSession(sessionId)
}

/**
 * 获取界面订阅的 store；历史期间保留已发布渲染树，批次结束后统一更新。
 */

export function useCurrentStore() {
  const data = useCurrentDataBySession()
  return data.store.renderStore
}

/**
 * 获取当前数据的 rawData
 */
export function useCurrentRawData() {
  const data = useCurrentDataBySession()
  return data.rawData
}

/**
 * 获取当前数据的 meta
 */
export function useCurrentMeta() {
  const data = useCurrentDataBySession()
  return data.meta
}

/**
 * 获取当前数据的 request
 */
export function useCurrentRequest() {
  const data = useCurrentDataBySession()
  return data.request
}

import { globalSessionEngine } from './ChatMultiSessionController'
import useCurrentSessionId from './useCurrentSessionId'

/**
 * @description 获取当前会话的数据
 */
function useCurrentDataBySession() {
  const sessionId = useCurrentSessionId()
  return globalSessionEngine.ensureSession(sessionId)
}

/**
 * 获取当前数据的 store
 */

export function useCurrentStore() {
  const data = useCurrentDataBySession()
  return data.store
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

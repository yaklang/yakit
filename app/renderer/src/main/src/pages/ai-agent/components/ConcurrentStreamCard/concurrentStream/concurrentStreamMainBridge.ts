import { globalSessionEngine } from '@/pages/ai-re-act/hooks/ChatMultiSessionController'
import { buildConcurrentStreamFramePayload } from './buildConcurrentStreamFramePayload'
import type { ConcurrentStreamFramePayload } from '../concurrentStreamFrame'

import { ipc } from '@/services/ipc'

const FETCH_REQUEST = 'fetch-concurrent-stream-contents-request'

let bridgeReady = false
let teardown: (() => void) | null = null

/**
 * 主窗口：响应 aux 子窗的 rawData 拉取。
 * 子窗通过 fetch-concurrent-stream-contents 拿到的是仅含元数据的 frame，
 * 收到请求后从 globalSessionEngine 取最新 store + rawData，复用 buildConcurrentStreamFramePayload
 * 收集 task 自身 / children / group 孙节点的原始数据，回传给子窗。
 *
 * @returns teardown 函数，调用后卸载监听并允许重新 setup。
 */
export function setupConcurrentStreamMainBridge() {
  if (bridgeReady) return teardown

  const handler = (payload: unknown) => {
    if (!payload || typeof payload !== 'object') return
    if (
      !('requestId' in payload) ||
      typeof payload.requestId !== 'string' ||
      !('session' in payload) ||
      typeof payload.session !== 'string' ||
      !('token' in payload) ||
      typeof payload.token !== 'string'
    )
      return
    const chatType = 'chatType' in payload && typeof payload.chatType === 'string' ? payload.chatType : undefined
    const { requestId, session, token } = payload
    if (!requestId || !session || !token) return

    const { store, rawData } = globalSessionEngine.ensureSession(session)
    // 子窗主动拉取全量数据，必须填充 rawData + execFileRecord
    const full = buildConcurrentStreamFramePayload({ token, session, chatType, store, rawData, withRawData: true })
    const entries = full ? Array.from(full.rawData.entries()) : []
    const execFileRecord = full ? Array.from(full.execFileRecord.entries()) : []
    const childrenTokens = full ? full.childrenTokens : []

    void ipc
      .invoke('local', 'reply-concurrent-stream-contents', {
        requestId,
        data: {
          rawData: entries,
          execFileRecord,
          childrenTokens,
        },
      })
      .catch((error) => console.error('Concurrent stream reply failed', error))
  }

  const unsubscribe = ipc.on(FETCH_REQUEST, handler)
  bridgeReady = true

  teardown = () => {
    unsubscribe()
    bridgeReady = false
    teardown = null
  }
  return teardown
}

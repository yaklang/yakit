import { globalSessionEngine } from '@/pages/ai-re-act/hooks/ChatMultiSessionController'
import { buildConcurrentStreamFramePayload } from './buildConcurrentStreamFramePayload'
import type { ConcurrentStreamFramePayload } from '../concurrentStreamFrame'

const { ipcRenderer } = window.require('electron')

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

  const handler = (_event: unknown, payload: ConcurrentStreamFramePayload & { requestId: string }) => {
    const { requestId, session, token, chatType } = payload
    if (!requestId || !session || !token) return

    const { store, rawData } = globalSessionEngine.ensureSession(session)
    const full = buildConcurrentStreamFramePayload({ token, session, chatType, store, rawData })
    const entries = full ? Array.from(full.rawData.entries()) : []

    ipcRenderer.send(`fetch-concurrent-stream-contents-response-${requestId}`, { rawData: entries })
  }

  ipcRenderer.on(FETCH_REQUEST, handler)
  bridgeReady = true

  teardown = () => {
    ipcRenderer.removeListener(FETCH_REQUEST, handler)
    bridgeReady = false
    teardown = null
  }
  return teardown
}

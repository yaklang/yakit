import { globalSessionEngine } from '@/pages/ai-re-act/hooks/ChatMultiSessionController'
import { buildConcurrentStreamFramePayload } from './buildConcurrentStreamFramePayload'
import type { ConcurrentStreamFramePayload } from '../concurrentStreamFrame'
import type { AIChatSendParams } from '@/pages/ai-re-act/hooks/type'
import { toAIChatSendType } from '@/pages/ai-re-act/hooks/type'
import type { ChatListRenderType } from '@/pages/ai-re-act/hooks/aiRender'

const { ipcRenderer } = window.require('electron')

const FETCH_REQUEST = 'fetch-concurrent-stream-contents-request'
/** aux 子窗转发"跳过长时间加载"等交互动作到主窗口会话 */
const INTERACTIVE_ACTION_REQUEST = 'ai-concurrent-stream-interactive-action-request'

interface InteractiveActionPayload {
  requestId: string
  session: string
  /** 会话渲染类型（task / reAct），映射为发送侧的 casual/task */
  chatType: ChatListRenderType
  params: AIChatSendParams['params']
}

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
    // 子窗主动拉取全量数据，必须填充 rawData + execFileRecord
    const full = buildConcurrentStreamFramePayload({ token, session, chatType, store, rawData, withRawData: true })
    const entries = full ? Array.from(full.rawData.entries()) : []
    const execFileRecord = full ? Array.from(full.execFileRecord.entries()) : []
    const childrenTokens = full ? full.childrenTokens : []

    ipcRenderer.send(`fetch-concurrent-stream-contents-response-${requestId}`, {
      rawData: entries,
      execFileRecord,
      childrenTokens,
    })
  }

  /** aux 子窗的交互动作转发（如工具卡"跳过长时间加载"）：代为走主窗口会话发送 */
  const interactiveActionHandler = (_event: unknown, payload: InteractiveActionPayload) => {
    const { requestId, session, chatType, params } = payload || {}
    let success = false
    let message = ''
    try {
      if (!requestId || !session || !params) {
        message = 'invalid payload'
      } else if (!globalSessionEngine.isSessionReady(session)) {
        message = 'session not ready'
      } else {
        globalSessionEngine.handleSendMessage({
          token: session,
          type: toAIChatSendType(chatType),
          params,
        })
        success = true
      }
    } catch (error) {
      success = false
      message = error instanceof Error ? error.message : String(error)
    }
    ipcRenderer.send(`ai-concurrent-stream-interactive-action-response-${requestId}`, { success, message })
  }

  ipcRenderer.on(FETCH_REQUEST, handler)
  ipcRenderer.on(INTERACTIVE_ACTION_REQUEST, interactiveActionHandler)
  bridgeReady = true

  teardown = () => {
    ipcRenderer.removeListener(FETCH_REQUEST, handler)
    ipcRenderer.removeListener(INTERACTIVE_ACTION_REQUEST, interactiveActionHandler)
    bridgeReady = false
    teardown = null
  }
  return teardown
}

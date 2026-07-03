// useChatIPC.ts
import { useEffect, useCallback, useRef } from 'react'
import { globalSessionEngine } from './ChatMultiSessionController'
import type { AIChatIPCStartParams, AIChatSendParams } from './type'
import { useMemoizedFn } from 'ahooks'

import useCurrentSessionId from './useCurrentSessionId'
const { ipcRenderer } = window.require('electron')

export function useChatIPC() {
  const sessionId = useCurrentSessionId()
  // TODO: 我需要知道这个hook所在的页面，从而在生命周期的卸载时期关闭所有会话
  const currentSessionIdRef = useRef(sessionId)

  useEffect(() => {
    currentSessionIdRef.current = sessionId
  }, [sessionId])

  // 这里一定要使用useCallback，通过依赖的sessionId变化，将上一个sessionId的on监听事件进行闭包
  // 多个sessionId就会生成多个自己的监听闭包，从而实现多会话的独立监听
  const onStart = useCallback(
    (args: AIChatIPCStartParams, onSuccess?: (sessionId: string) => void) => {
      // 监听网络，直接丢给大脑处理
      ipcRenderer.on(`${sessionId}-data`, (e, res: any) => {
        globalSessionEngine.handleGrpcOutputEvent(sessionId, res)
      })
      ipcRenderer.on(`${sessionId}-error`, (e, res: any) => {
        globalSessionEngine.handleSessionError(sessionId, res)
      })
      ipcRenderer.on(`${sessionId}-end`, (e, res: any) => {
        globalSessionEngine.handleSessionEnd(sessionId, res)
      })

      globalSessionEngine.handleStartSession(args, onSuccess)
    },
    [sessionId],
  )

  const onSend = useMemoizedFn((payload: AIChatSendParams) => {
    globalSessionEngine.handleSendMessage(payload)
  })

  const onClose = useMemoizedFn((sessionId: string[]) => {
    /** globalSessionEngine.forceCloseSession
     * TODO - 需要AISource且支持多个会话关闭
     * TODO - sessionId传[]:清除source下的所有会话
     */
    // globalSessionEngine.forceCloseSession(sessionId, params.source)
  })

  // 组件卸载时拔插头，清理闭环
  useEffect(() => {
    return () => {
      // globalSessionEngine.forceCloseSession(currentSessionIdRef.current)
    }
  }, [])

  return { onStart, onSend, onClose }
}

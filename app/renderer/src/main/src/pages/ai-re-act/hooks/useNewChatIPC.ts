// useChatIPC.ts
import { useEffect, useContext, useCallback, useRef } from 'react'
import { globalSessionEngine } from './ChatMultiSessionController'
import { AIChatIPCStartParams, AIChatSendParams } from './type'
import { useMemoizedFn } from 'ahooks'
import { SessionIdContext } from './explame/SessionRuntime'
const { ipcRenderer } = window.require('electron')

export function useChatIPC() {
  const sessionId = useContext(SessionIdContext)
  const currentSessionIdRef = useRef(sessionId)

  useEffect(() => {
    currentSessionIdRef.current = sessionId
  }, [sessionId])

  const onStart = useCallback(
    (sessionID: string, args: AIChatIPCStartParams, onSuccess?: () => void) => {
      // 监听网络，直接丢给大脑处理
      ipcRenderer.on(`${sessionId}-data`, (e, res: any) => {
        globalSessionEngine.handleGrpcOutputEvent(sessionId, res)
      })

      globalSessionEngine.handleStartSession(sessionID, args, onSuccess)
    },
    [sessionId],
  )

  const onSend = useMemoizedFn((payload: AIChatSendParams) => {
    globalSessionEngine.handleSendMessage(payload)
  })

  // 组件卸载时拔插头，清理闭环
  useEffect(() => {
    return () => {
      globalSessionEngine.forceCloseSession(currentSessionIdRef.current)
    }
  }, [])

  return { onStart, onSend }
}

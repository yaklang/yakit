import { useEffect, useRef, useState } from 'react'
import { globalSessionEngine, type PendingAIChat } from './ChatMultiSessionController'
import type { AIChatSendParams } from './type'
import { useMemoizedFn } from 'ahooks'
import type { UseChatIPCStartParams } from '@/pages/ai-agent/useContext/AIAgentContext'
import type { YakitRouteType } from '@/enums/yakitRoute'

export function useChatIPC(route: YakitRouteType, pageId: string) {
  const [pendingChat, setPendingChat] = useState<PendingAIChat>()
  const pendingToken = useRef<string | undefined>(undefined)
  const pendingRef = useRef<PendingAIChat | undefined>(undefined)
  const cancelPendingChat = useMemoizedFn(() => {
    pendingRef.current = undefined
    const token = pendingToken.current
    pendingToken.current = undefined
    if (token) globalSessionEngine.cancelPendingConnection(token)
    setPendingChat(undefined)
  })
  const onStart = useMemoizedFn(({ onLinkStart, onLinkSuccess, ...input }: UseChatIPCStartParams) => {
    if (pendingRef.current?.status === 'connecting') return
    if (pendingToken.current) globalSessionEngine.cancelPendingConnection(pendingToken.current, { keepDraft: true })
    pendingToken.current = undefined
    setPendingChat(undefined)
    let streamToken: string | undefined
    return globalSessionEngine.handleStartSession(
      { ...input, route, pageId },
      {
        onLinkStart: (token) => {
          streamToken = token
          onLinkStart?.(token)
        },
        onPendingChange: (pending) => {
          if (pending.status === 'connecting') pendingToken.current = pending.streamToken
          if (pendingToken.current === pending.streamToken) {
            pendingRef.current = pending
            setPendingChat(pending)
          }
        },
        onLinkSuccess: (sessionId) => {
          onLinkSuccess?.(sessionId)
          if (pendingToken.current === streamToken) {
            pendingToken.current = undefined
            pendingRef.current = undefined
            setPendingChat(undefined)
          }
        },
      },
    )
  })
  const onSend = useMemoizedFn((payload: AIChatSendParams) => globalSessionEngine.handleSendMessage(payload))
  const onClose = useMemoizedFn((sessionIds: string[], onEnd?: () => void) => {
    globalSessionEngine.forceCloseSession({ sessionIds, onEnd })
  })
  const onUpdatePageId = useMemoizedFn((sessionId: string) =>
    globalSessionEngine.rebindSessionPageId(sessionId, pageId),
  )
  useEffect(
    () => () => {
      cancelPendingChat()
      globalSessionEngine.onPageUnload(route, pageId)
    },
    [],
  )
  return { onStart, onSend, onClose, onUpdatePageId, pendingChat, cancelPendingChat }
}

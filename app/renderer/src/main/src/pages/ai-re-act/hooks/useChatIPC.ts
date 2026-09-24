import { useEffect, useRef, useState } from 'react'
import { globalSessionEngine, type PendingAIChat } from './ChatMultiSessionController'
import type { AIChatSendParams } from './type'
import { useMemoizedFn } from 'ahooks'
import type { UseChatIPCStartParams } from '@/pages/ai-agent/useContext/AIAgentContext'
import type { YakitRouteType } from '@/enums/yakitRoute'

export function useChatIPC(route: YakitRouteType, pageId: string, independentSessions = false) {
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
  // 只解除当前视图与 pending 的关联，连接继续由 Controller 持有。
  const detachPendingChat = useMemoizedFn(() => {
    pendingRef.current = undefined
    pendingToken.current = undefined
    setPendingChat(undefined)
  })
  const onStart = useMemoizedFn(({ onLinkStart, onLinkSuccess, ...input }: UseChatIPCStartParams) => {
    // Agent 的不同会话可以同时连接；其他入口保持原有单 pending 行为。
    if (!independentSessions || input.kind === 'new') {
      if (pendingRef.current?.status === 'connecting') return
      if (pendingToken.current) globalSessionEngine.cancelPendingConnection(pendingToken.current, { keepDraft: true })
      detachPendingChat()
    }
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
            const visiblePending: PendingAIChat = {
              ...pending,
              retry: () => {
                onStart({ ...input, onLinkStart, onLinkSuccess })
              },
            }
            pendingRef.current = visiblePending
            setPendingChat(visiblePending)
          }
        },
        onLinkSuccess: (sessionId) => {
          const foreground = !independentSessions || input.kind === 'resume' || pendingToken.current === streamToken
          onLinkSuccess?.(sessionId, foreground)
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
  return { onStart, onSend, onClose, onUpdatePageId, pendingChat, cancelPendingChat, detachPendingChat }
}

// useChatIPC.ts
import { useEffect } from 'react'
import type { ChatMultiSessionController } from './ChatMultiSessionController'
import { globalSessionEngine } from './ChatMultiSessionController'
import type { AIChatSendParams } from './type'
import { useMemoizedFn } from 'ahooks'
import type { UseChatIPCStartParams } from '@/pages/ai-agent/useContext/AIAgentContext'
import type { YakitRouteType } from '@/enums/yakitRoute'
import { yakitNotify } from '@/utils/notification'

export function useChatIPC(route: YakitRouteType, pageId: string) {
  /**
   * 会话控制器通过 openStream 原子建立实例和回调，组件只负责业务归属。
   */
  const onStart = useMemoizedFn(({ token, params, localSource, onLinkStart, onLinkSuccess }: UseChatIPCStartParams) => {
    if (globalSessionEngine.isSessionReady(token)) {
      yakitNotify('warning', '会话已经存在，请勿重复建立！')
      return
    }

    let cb: Parameters<ChatMultiSessionController['handleStartSession']>[1] = undefined
    if (onLinkStart || onLinkSuccess) {
      cb = {
        onLinkStart,
        onLinkSuccess,
      }
    }
    globalSessionEngine.handleStartSession({ token, params, route, pageId, localSource }, cb)
  })

  const onSend = useMemoizedFn((payload: AIChatSendParams) => {
    globalSessionEngine.handleSendMessage(payload)
  })

  const onClose = useMemoizedFn((sessionIds: string[], onEnd?: () => void) => {
    globalSessionEngine.forceCloseSession({ sessionIds, onEnd })
  })

  /** 将指定 session 换绑到本 hook 入参 pageId（pageId 为定值） */
  const onUpdatePageId = useMemoizedFn((sessionId: string) => {
    globalSessionEngine.rebindSessionPageId(sessionId, pageId)
  })

  // 组件卸载时拔插头，清理闭环
  useEffect(() => {
    return () => {
      globalSessionEngine.onPageUnload(route, pageId)
    }
  }, [])

  return { onStart, onSend, onClose, onUpdatePageId }
}

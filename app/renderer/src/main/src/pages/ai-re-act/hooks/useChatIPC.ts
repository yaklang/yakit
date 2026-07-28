// useChatIPC.ts
import { useEffect } from 'react'
import { globalSessionEngine } from './ChatMultiSessionController'
import type { AIChatSendParams } from './type'
import { useMemoizedFn } from 'ahooks'
import type { UseChatIPCStartParams } from '@/pages/ai-agent/useContext/AIAgentContext'
import type { YakitRouteType } from '@/enums/yakitRoute'
import { yakitNotify } from '@/utils/notification'
const { ipcRenderer } = window.require('electron')

export function useChatIPC(route: YakitRouteType, pageId: string) {
  /**
   * isSessionReady 已连则直接返回（不动已有监听）→ 用入参 token 挂监听 → handleStartSession
   * prepare 异步，invoke 晚于本同步栈挂监听，不会丢流；token 不依赖 React 闭包里的 SessionID
   */
  const onStart = useMemoizedFn(({ token, params, onSuccess }: UseChatIPCStartParams) => {
    if (globalSessionEngine.isSessionReady(token)) {
      yakitNotify('warning', '会话已经存在，请勿重复建立！')
      return
    }

    ipcRenderer.removeAllListeners(`${token}-data`)
    ipcRenderer.removeAllListeners(`${token}-error`)
    ipcRenderer.removeAllListeners(`${token}-end`)
    ipcRenderer.on(`${token}-data`, (e, res: any) => {
      globalSessionEngine.handleGrpcOutputEvent(token, res)
    })
    ipcRenderer.on(`${token}-error`, (e, res: any) => {
      globalSessionEngine.handleSessionError(token, res)
    })
    ipcRenderer.on(`${token}-end`, (e, res: any) => {
      globalSessionEngine.handleSessionEnd(token, res)
    })

    globalSessionEngine.handleStartSession({ token, params, route, pageId }, onSuccess)
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

// useChatIPC.ts
import { useEffect } from 'react'
import { globalSessionEngine } from './ChatMultiSessionController'
import type { AIChatSendParams } from './type'
import { useMemoizedFn } from 'ahooks'
import type { UseChatIPCStartParams } from '@/pages/ai-agent/useContext/AIAgentContext'
import type { YakitRouteType } from '@/enums/yakitRoute'
const { ipcRenderer } = window.require('electron')

export function useChatIPC(route: YakitRouteType, pageId: string) {
  // IPC 监听的 channel 用入参 token 注册，与 handleStartSession 的 token 完全对齐
  // 这样在欢迎页"从无到有建立会话"时，不会出现 setActiveChat 异步未生效、闭包 sessionId 仍为空导致监听错位的问题
  const onStart = useMemoizedFn(({ token, params, onSuccess }: UseChatIPCStartParams) => {
    // 监听网络，直接丢给大脑处理
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

import emiter from '@/utils/eventBus/eventBus'

/**
 * 等待后端 ai_session 推送（立即运行的任务会话已创建/持久化），最多等 timeoutMs。
 * 推送或超时任一先到即结束；收到推送时 resolve(sessionId)，超时 resolve(undefined)。
 * 重复调用 clearTimeout / off / resolve 均幂等，无需去重标记。
 */
export const waitForAISessionPush = (timeoutMs: number) =>
  new Promise<string | undefined>((resolve) => {
    const finish = (data?: string) => {
      emiter.off('onServerPushAISession', finish)
      window.clearTimeout(timer)
      try {
        const payload = data ? (JSON.parse(data) as { sessionId?: string }) : undefined
        resolve(payload?.sessionId)
      } catch {
        resolve(undefined)
      }
    }
    const timer = window.setTimeout(() => finish(), timeoutMs)
    emiter.on('onServerPushAISession', finish)
  })

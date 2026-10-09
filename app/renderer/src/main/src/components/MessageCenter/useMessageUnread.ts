import { useEffect, useState } from 'react'
import { useStore } from '@/store'
import { isEnpriTrace } from '@/utils/envfile'
import emiter from '@/utils/eventBus/eventBus'
import { failed } from '@/utils/notification'
import { apiFetchQueryMessage, apiFetchQueryWebMessage } from './utils'

/** 顶栏头像的未读总数，与更新通知和消息侧栏的挂载状态无关。 */
export const useMessageUnread = () => {
  const { userInfo } = useStore()
  const { isLogin, platform, user_id, token } = userInfo
  const hasWebChannel = isEnpriTrace()
  const [pluginUnreadCount, setPluginUnreadCount] = useState(0)
  const [webUnreadCount, setWebUnreadCount] = useState(0)

  useEffect(() => {
    setPluginUnreadCount(0)
    setWebUnreadCount(0)
    if (!isLogin) return

    let disposed = false
    let pluginRequest = 0
    let webRequest = 0
    const fetchPlugin = async () => {
      const request = ++pluginRequest
      try {
        const res = await apiFetchQueryMessage({ page: 1, limit: 20 }, { isRead: 'false' })
        if (!disposed && request === pluginRequest) {
          setPluginUnreadCount(Math.max(0, Number(res.pagemeta?.total) || 0))
        }
      } catch (error) {
        if (!disposed && request === pluginRequest) failed(String(error))
      }
    }
    const fetchWeb = async () => {
      if (!hasWebChannel) return
      const request = ++webRequest
      try {
        const res = await apiFetchQueryWebMessage({ page: 1, limit: 20 }, { isRead: 'false' })
        if (!disposed && request === webRequest) {
          setWebUnreadCount(Math.max(0, Number(res.pagemeta?.total) || 0))
        }
      } catch {
        // 暂时请求失败时保留最近一次成功查询的未读状态。
      }
    }
    const refresh = () => {
      void fetchPlugin()
      void fetchWeb()
    }
    const onMessage = (data: string) => {
      try {
        if (JSON.parse(data)?.isRead === false) {
          // 推送先保底显示未读，再通过权威查询更新总数；重复推送不会无界累加。
          setPluginUnreadCount((count) => Math.max(count, 1))
          void fetchPlugin()
        }
      } catch {
        // 忽略无效推送。
      }
    }

    emiter.on('onRefreshMessageSocket', onMessage)
    emiter.on('onRefreshMessageUnread', refresh)
    refresh()
    const timer = hasWebChannel ? window.setInterval(fetchWeb, 60_000) : undefined
    return () => {
      disposed = true
      window.clearInterval(timer)
      emiter.off('onRefreshMessageSocket', onMessage)
      emiter.off('onRefreshMessageUnread', refresh)
    }
  }, [isLogin, platform, user_id, token, hasWebChannel])

  return isLogin ? pluginUnreadCount + webUnreadCount : 0
}

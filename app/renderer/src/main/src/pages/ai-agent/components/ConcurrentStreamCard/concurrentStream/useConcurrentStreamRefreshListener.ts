import { useEffect } from 'react'
import { openAIConcurrentStream } from '@/utils/openWebsite'
import { useCurrentRawData, useCurrentStore } from '@/pages/ai-re-act/hooks/useCurrentDataBySession'
import useCurrentSessionId from '@/pages/ai-re-act/hooks/useCurrentSessionId'
import { useCreation } from 'ahooks'
import { buildConcurrentStreamFramePayload } from './buildConcurrentStreamFramePayload'

const { ipcRenderer } = window.require('electron')

/**
 * 主窗口卡片监听子窗刷新请求。
 * 收到请求后从主窗口 store 重新构建最新的 framePayload（含最新 rawData），
 * 静默推送到子窗，逻辑与 openChildWindow 共用 buildConcurrentStreamFramePayload。
 */
export function useConcurrentStreamRefreshListener(token: string, enabled = true) {
  const store = useCurrentStore()
  const session = useCurrentSessionId()
  const rawData = useCurrentRawData()

  const chatType = useCreation(() => {
    if (!rawData) return
    const itemData = rawData.contents.get(token)
    if (!itemData) return
    return itemData.chatType
  }, [])

  useEffect(() => {
    if (!enabled) return

    const handleRefresh = (_event: unknown, params: { type?: string; data?: Record<string, unknown> }) => {
      if (params?.type !== 'openAIConcurrentStream') return

      const refreshData = params.data
      if (refreshData?.session !== session || refreshData?.token !== token || refreshData?.chatType !== chatType) {
        return
      }

      const framePayload = buildConcurrentStreamFramePayload({ token, session, chatType, store, rawData })
      if (framePayload) {
        openAIConcurrentStream(framePayload, { silent: true })
      }
    }

    ipcRenderer.on('refresh-ai-concurrent-stream', handleRefresh)

    return () => {
      ipcRenderer.removeListener('refresh-ai-concurrent-stream', handleRefresh)
    }
  }, [enabled, session, token, chatType, store, rawData])
}

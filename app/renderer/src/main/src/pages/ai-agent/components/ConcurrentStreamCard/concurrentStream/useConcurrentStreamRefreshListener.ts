import { useEffect } from 'react'
import type { ReActChatElement } from '@/pages/ai-re-act/hooks/aiRender'
import { openAIConcurrentStream } from '@/utils/openWebsite'
import type { ConcurrentStreamFramePayload } from '../concurrentStreamFrame'

const { ipcRenderer } = window.require('electron')

/** 主窗口卡片监听子窗刷新请求，推送最新 frame 数据 */
export function useConcurrentStreamRefreshListener(
  framePayload: ConcurrentStreamFramePayload,
  session: string,
  token: string,
  chatType: ReActChatElement['chatType'],
  enabled = true,
) {
  useEffect(() => {
    if (!enabled) return

    const handleRefresh = (_event: unknown, params: { type?: string; data?: Record<string, unknown> }) => {
      if (params?.type !== 'openAIConcurrentStream') return

      const refreshData = params.data
      if (refreshData?.session !== session || refreshData?.token !== token || refreshData?.chatType !== chatType) {
        return
      }

      openAIConcurrentStream(framePayload, { silent: true })
    }

    ipcRenderer.on('refresh-ai-concurrent-stream', handleRefresh)

    return () => {
      ipcRenderer.removeListener('refresh-ai-concurrent-stream', handleRefresh)
    }
  }, [chatType, enabled, framePayload, session, token])
}

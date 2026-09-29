import { useMemoizedFn } from 'ahooks'
import { YakitRoute } from '@/enums/yakitRoute'
import { globalSessionEngine } from '@/pages/ai-re-act/hooks/ChatMultiSessionController'
import type { ComponentParams } from '@/routes/newRoute'
import type { PageCache } from './MainOperatorContentType'

/** 历史会话已在某个 AI Agent Tab 中则返回该 Tab */
const findAIAgentTabBySessionId = (pages: PageCache[], sessionId: string, ownerPageId?: string) => {
  if (!sessionId) return undefined
  return pages.find((item) => {
    if (item.route !== YakitRoute.AI_Agent) return false
    if (item.pageParams?.aiAgentPageInfo?.session?.SessionID === sessionId) return true
    return !!(ownerPageId && (item.pageParams?.id || item.routeKey) === ownerPageId)
  })
}

/** 会话 ID 在启动前已确定，直接定位已打开或正在建联的 Tab。 */
export function useOpenAIAgentPage({
  getPageCache,
  setCurrentTabKey,
  openAIAgentExtraTab,
}: {
  getPageCache: () => PageCache[]
  setCurrentTabKey: (key: string) => void
  openAIAgentExtraTab: (pageParams?: ComponentParams) => void
}) {
  return useMemoizedFn((pageParams?: ComponentParams) => {
    const sessionId = pageParams?.aiAgentPageInfo?.session?.SessionID || ''
    if (sessionId) {
      const ownerPageId = globalSessionEngine.getSessionPageId(sessionId, YakitRoute.AI_Agent)
      const existing = findAIAgentTabBySessionId(getPageCache(), sessionId, ownerPageId)
      if (existing) {
        setCurrentTabKey(existing.routeKey)
        return
      }
    }
    openAIAgentExtraTab(pageParams)
  })
}

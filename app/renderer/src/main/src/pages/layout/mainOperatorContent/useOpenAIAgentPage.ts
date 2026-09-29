import { useEffect, useRef } from 'react'
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

/** 历史打开请求等待身份判定；切换页面或发起新请求后，旧请求不再导航。 */
export function useOpenAIAgentPage({
  currentTabKey,
  pageCache,
  getPageCache,
  setCurrentTabKey,
  openAIAgentExtraTab,
}: {
  currentTabKey: string
  pageCache: PageCache[]
  getPageCache: () => PageCache[]
  setCurrentTabKey: (key: string) => void
  openAIAgentExtraTab: (pageParams?: ComponentParams) => void
}) {
  const aiAgentOpenRequest = useRef(0)
  useEffect(
    () => () => {
      // 切换一级页或卸载后，旧的等待请求不能再抢占当前页面。
      aiAgentOpenRequest.current++
    },
    [currentTabKey],
  )
  return useMemoizedFn(async (pageParams?: ComponentParams) => {
    const request = ++aiAgentOpenRequest.current
    const sessionId = pageParams?.aiAgentPageInfo?.session?.SessionID || ''
    if (sessionId) {
      const ownerPageId = globalSessionEngine.getSessionPageId(sessionId, YakitRoute.AI_Agent)
      const existing = findAIAgentTabBySessionId(pageCache, sessionId, ownerPageId)
      if (existing) {
        setCurrentTabKey(existing.routeKey)
        return
      }
      const pendingPageId = await globalSessionEngine.waitForSessionPageId(sessionId, YakitRoute.AI_Agent)
      if (request !== aiAgentOpenRequest.current) return
      const pendingTab = findAIAgentTabBySessionId(getPageCache(), sessionId, pendingPageId)
      if (pendingTab) {
        setCurrentTabKey(pendingTab.routeKey)
        return
      }
    }
    openAIAgentExtraTab(pageParams)
  })
}

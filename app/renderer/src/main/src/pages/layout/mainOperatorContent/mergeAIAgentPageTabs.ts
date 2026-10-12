import { YakitRoute } from '@/enums/yakitRoute'
import { YakitRouteToPageInfo } from '@/routes/newRoute'
import type { PageProps } from '@/store/pageInfo'
import { isMemfit } from '@/utils/envfile'
import type { PageCache } from './MainOperatorContentType'

/** 同步 AI 标签名称和排序，保留 Memfit 固定页顺序。 */
export function mergeAIAgentPageTabs(pages: PageCache[], data: PageProps): PageCache[] {
  const byId = new Map(pages.filter((page) => page.route === YakitRoute.AI_Agent).map((page) => [page.routeKey, page])) // ai-agent页面 routeKey 和 pageInfo 中的 node.pageId 使用的是同一个标签 ID
  const aiTabs = [...data.pageList]
    .sort((a, b) => a.sortFieId - b.sortFieId)
    .map((node): PageCache => {
      const previous = byId.get(node.pageId)
      const info = node.pageParamsInfo.aiAgentPageInfo
      if (previous && previous.verbose === node.pageName && previous.pageParams?.aiAgentPageInfo === info)
        return previous
      return {
        ...previous,
        route: YakitRoute.AI_Agent,
        routeKey: node.pageId,
        verbose: node.pageName,
        verboseKey: undefined,
        menuName: YakitRouteToPageInfo[YakitRoute.AI_Agent].label,
        singleNode: true,
        multipleNode: [],
        pageParams: { ...previous?.pageParams, id: node.pageId, aiAgentPageInfo: info },
      }
    })
  const fixedAI = isMemfit() ? byId.get(YakitRoute.AI_Agent) : undefined
  const remainingAITabs = fixedAI ? aiTabs.filter((page) => page.routeKey !== YakitRoute.AI_Agent) : aiTabs
  const result: PageCache[] = fixedAI ? [aiTabs.find((page) => page.routeKey === YakitRoute.AI_Agent) || fixedAI] : []
  let index = 0
  for (const page of pages) {
    if (page === fixedAI) continue
    if (fixedAI && page.route === YakitRoute.AI_REPOSITORY) result.splice(1, 0, page)
    else if (page.route !== YakitRoute.AI_Agent) result.push(page)
    else if (index < remainingAITabs.length) result.push(remainingAITabs[index++])
  }
  result.push(...remainingAITabs.slice(index))
  return result
}

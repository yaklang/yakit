import { YakitRoute } from '@/enums/yakitRoute'
import { usePageInfo } from '@/store/pageInfo'
import type { AIAgentPageInfoProps } from '@/store/pageInfo'
import emiter from '@/utils/eventBus/eventBus'

interface SyncAIAgentPageInfoParams {
  /** 优先按 pageId 定位，支持绑定新会话或清空会话。 */
  pageId?: string
  sessionId?: string
  title?: string
  /** 浅合并页面参数；session 由调用方提供完整值，传 undefined 可清空。 */
  aiAgentPageInfo?: AIAgentPageInfoProps
  /** 是否广播历史列表标题更新，默认发送。 */
  emitSessionData?: boolean
}

/** 合并 AI 页面参数、同步 Tab 标题，并按需广播历史列表标题。 */
export const syncAIAgentPageInfo = ({
  pageId,
  sessionId,
  title,
  aiAgentPageInfo,
  emitSessionData = true,
}: SyncAIAgentPageInfoParams) => {
  const { pages, queryPagesDataById, updatePagesDataCacheById } = usePageInfo.getState()
  const node = pageId
    ? queryPagesDataById(YakitRoute.AI_Agent, pageId)
    : sessionId
      ? pages
          .get(YakitRoute.AI_Agent)
          ?.pageList.find((item) => item.pageParamsInfo.aiAgentPageInfo?.session?.SessionID === sessionId)
      : undefined
  if (!node) return

  const currentInfo = node.pageParamsInfo.aiAgentPageInfo
  const nextInfo = { ...currentInfo, ...aiAgentPageInfo }
  const session = nextInfo.session
  let pageName = node.pageName
  if (title?.trim()) {
    pageName = title
    if (session) nextInfo.session = { ...session, Title: title }
  }
  if (!aiAgentPageInfo && node.pageName === pageName && currentInfo?.session?.Title === nextInfo.session?.Title) return

  updatePagesDataCacheById(YakitRoute.AI_Agent, {
    ...node,
    pageName,
    pageParamsInfo: {
      ...node.pageParamsInfo,
      aiAgentPageInfo: nextInfo,
    },
  })
  if (emitSessionData && session && node.pageName !== pageName) {
    emiter.emit(
      'sessionData',
      JSON.stringify({ type: 'updateSession', sessionId: session.SessionID, updates: { Title: pageName } }),
    )
  }
}

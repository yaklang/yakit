import { fromServerAIStartParams } from '@/pages/ai-re-act/hooks/grpcApi'
import type { PageNodeItemProps } from './pageInfo'

// 旧缓存为数组，StartParams 使用字节。版本 1 起与前端内存统一使用 KB。
const AI_AGENT_TAB_CACHE_VERSION = 1

export const serializeAIAgentTabCache = (pageList: PageNodeItemProps[]): string =>
  JSON.stringify({ version: AI_AGENT_TAB_CACHE_VERSION, pageList })

export const restoreAIAgentTabCache = (cached: unknown): PageNodeItemProps[] => {
  if (Array.isArray(cached)) {
    return (cached as PageNodeItemProps[]).map((node) => {
      const info = node.pageParamsInfo?.aiAgentPageInfo
      const session = info?.session
      if (!session?.StartParams) return node

      return {
        ...node,
        pageParamsInfo: {
          ...node.pageParamsInfo,
          aiAgentPageInfo: {
            ...info,
            session: { ...session, StartParams: fromServerAIStartParams(session.StartParams) },
          },
        },
      }
    })
  }

  if (
    cached &&
    typeof cached === 'object' &&
    'version' in cached &&
    cached.version === AI_AGENT_TAB_CACHE_VERSION &&
    'pageList' in cached &&
    Array.isArray(cached.pageList)
  ) {
    return cached.pageList
  }

  throw new Error('Invalid AI Agent tab cache')
}

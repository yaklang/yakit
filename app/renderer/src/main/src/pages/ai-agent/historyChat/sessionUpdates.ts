import type { AISession } from '../type/aiChat'

/** 热补丁只携带变动字段，历史列表合并时保留 Forge、资源及其他启动参数。 */
export const mergeAISessionUpdates = (session: AISession, updates: Partial<AISession>): AISession => ({
  ...session,
  ...updates,
  ...(updates.StartParams
    ? {
        StartParams: {
          ...session.StartParams,
          ...updates.StartParams,
          ...(updates.StartParams.Strategy
            ? { Strategy: { ...session.StartParams?.Strategy, ...updates.StartParams.Strategy } }
            : {}),
        },
      }
    : {}),
})

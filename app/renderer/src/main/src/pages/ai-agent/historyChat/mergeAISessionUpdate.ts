import type { AISession } from '../type/aiChat'

/**
 * 按 sessionId 合并会话增量。
 * StartParams / Strategy 做字段级合并，保留未出现在 updates 中的原字段。
 */
export const mergeAISessionUpdate = (session: AISession, sessionId: string, updates: Partial<AISession>): AISession => {
  if (session.SessionID !== sessionId) return session
  const next = { ...session, ...updates }
  if (updates.StartParams) {
    next.StartParams = { ...session.StartParams, ...updates.StartParams }
    if (updates.StartParams.Strategy) {
      next.StartParams.Strategy = { ...session.StartParams?.Strategy, ...updates.StartParams.Strategy }
    }
  }
  return next
}

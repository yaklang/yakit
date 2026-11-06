import type { AISession } from '../type/aiChat'

/** 叠两段会话增量。StartParams / Strategy 做字段级合并。 */
export const mergeAISessionPatch = (
  base: Partial<AISession> | undefined,
  extra: Partial<AISession>,
): Partial<AISession> => {
  if (!base) return extra
  const next = { ...base, ...extra }
  if (base.StartParams || extra.StartParams) {
    next.StartParams = { ...base.StartParams, ...extra.StartParams }
    if (base.StartParams?.Strategy || extra.StartParams?.Strategy) {
      next.StartParams.Strategy = { ...base.StartParams?.Strategy, ...extra.StartParams?.Strategy }
    }
  }
  return next
}

/**
 * 按 sessionId 合并会话增量。
 * StartParams / Strategy 做字段级合并，保留未出现在 updates 中的原字段。
 */
export const mergeAISessionUpdate = (session: AISession, sessionId: string, updates: Partial<AISession>): AISession => {
  if (session.SessionID !== sessionId) return session
  return { ...session, ...mergeAISessionPatch(session, updates), SessionID: session.SessionID }
}

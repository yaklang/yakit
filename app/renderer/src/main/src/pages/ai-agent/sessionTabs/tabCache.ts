import type { AISession, DeleteAISessionRequest } from '../type/aiChat'
export interface CachedSessionTab {
  id: string
  sessionId?: string
  title?: string
  employeeId?: string
  agentId?: number
}
export interface SessionTabCache {
  version: 1
  activeId: string
  tabs: CachedSessionTab[]
}

/** Cache references only. Session settings and attachments are restored through the existing history path. */
export function parseSessionTabCache(value: string): SessionTabCache | undefined {
  try {
    const data = JSON.parse(value)
    if (data?.version !== 1 || !Array.isArray(data.tabs)) return
    const ids = new Set<string>(),
      sessions = new Set<string>()
    const tabs: CachedSessionTab[] = []
    for (const item of data.tabs) {
      if (!item || typeof item.id !== 'string' || !item.id || ids.has(item.id)) continue
      const sessionId = typeof item.sessionId === 'string' && item.sessionId ? item.sessionId : undefined
      if (sessionId && sessions.has(sessionId)) continue
      ids.add(item.id)
      if (sessionId) sessions.add(sessionId)
      tabs.push({
        id: item.id,
        sessionId,
        title: typeof item.title === 'string' ? item.title.slice(0, 200) : undefined,
        employeeId: typeof item.employeeId === 'string' ? item.employeeId : undefined,
        agentId: Number.isSafeInteger(item.agentId) && item.agentId > 0 ? item.agentId : undefined,
      })
    }
    return {
      version: 1,
      activeId: tabs.some((tab) => tab.id === data.activeId) ? data.activeId : tabs[0]?.id || '',
      tabs,
    }
  } catch {
    return
  }
}

export function sessionMatchesDelete(session: AISession | undefined, request: DeleteAISessionRequest): boolean {
  if (!session) return false
  if (request.DeleteAll) return true
  const filter = request.Filter
  if (!filter) return false
  const created = Number(session.CreatedAt) < 1e11 ? Number(session.CreatedAt) * 1000 : Number(session.CreatedAt)
  return (
    (!filter.SessionID?.length || filter.SessionID.includes(session.SessionID)) &&
    (!filter.Source?.length || filter.Source.includes(session.Source)) &&
    (!filter.Platform?.length || filter.Platform.includes(session.IMSourceMeta?.Platform || '')) &&
    (!filter.BeforeTimestamp || created <= filter.BeforeTimestamp) &&
    (!filter.AfterTimestamp || created >= filter.AfterTimestamp)
  )
}

import emiter from '@/utils/eventBus/eventBus'
import { grpcQueryAISession } from '../grpc'
import { grpcRunAIReActScheduleNow } from './utils'
import type { AIReActSchedule } from '@/pages/ai-re-act/hooks/grpcApi'
import type { AISession } from '../type/aiChat'

const running = new Map<string, Promise<AISession | undefined>>()
const query = (ids?: string[]) =>
  grpcQueryAISession(
    {
      Pagination: { Page: 1, Limit: ids?.length || 100, OrderBy: 'created_at', Order: 'desc' },
      Filter: ids ? { SessionID: ids } : undefined,
    },
    true,
  )

export function chooseScheduleSession(
  schedule: AIReActSchedule,
  sessions: AISession[],
  previous: Set<string>,
  startedAt: number,
): AISession | undefined {
  if (schedule.TargetMode === 'continue_session')
    return sessions.find((session) => session.SessionID === schedule.TargetSessionID)
  const title = (schedule.Name || schedule.Payload?.Prompt || '').trim()
  const candidates = sessions.filter((session) => {
    const created = Number(session.CreatedAt) < 1e11 ? Number(session.CreatedAt) * 1000 : Number(session.CreatedAt)
    return (
      !previous.has(session.SessionID) &&
      created >= startedAt - 1000 &&
      title &&
      session.Title.trim() === title &&
      (!session.StartParams?.UserQuery || session.StartParams.UserQuery === schedule.Payload?.Prompt)
    )
  })
  // An uncorrelated push must never open another task's session. Ambiguity is visible to the caller.
  return candidates.length === 1 ? candidates[0] : undefined
}

export function runScheduleAndFindSession(schedule: AIReActSchedule): Promise<AISession | undefined> {
  const existing = running.get(schedule.UUID)
  if (existing) return existing
  const operation = (async () => {
    const before = schedule.TargetMode === 'continue_session' ? [] : (await query()).Data
    const previous = new Set(before.map((session) => session.SessionID))
    const pushed = new Set<string>()
    const listener = (raw: string) => {
      try {
        const data = JSON.parse(raw)
        if (typeof data.sessionId === 'string' && data.sessionId) pushed.add(data.sessionId)
      } catch {
        /* ignore malformed notifications */
      }
    }
    const startedAt = Date.now()
    emiter.on('onServerPushAISession', listener)
    try {
      await grpcRunAIReActScheduleNow({ UUID: schedule.UUID })
      await new Promise((resolve) => window.setTimeout(resolve, 2000))
      const ids =
        schedule.TargetMode === 'continue_session'
          ? schedule.TargetSessionID
            ? [schedule.TargetSessionID]
            : []
          : [...pushed]
      const sessions = (await query(ids.length ? ids : undefined)).Data
      return chooseScheduleSession(schedule, sessions, previous, startedAt)
    } finally {
      emiter.off('onServerPushAISession', listener)
    }
  })()
  running.set(schedule.UUID, operation)
  void operation
    .finally(() => {
      if (running.get(schedule.UUID) === operation) running.delete(schedule.UUID)
    })
    .catch(() => {})
  return operation
}

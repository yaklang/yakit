import { useEffect, useRef, useState } from 'react'
import { useMemoizedFn } from 'ahooks'
import emiter from '@/utils/eventBus/eventBus'
import type { AISession } from '../type/aiChat'
import { listCodingSessions, listCodingWorktrees, queryCodingSessionDetails, queryCodingWorkspaces } from './api'
import type { CodingSession, CodingWorkspace, CodingWorktree } from './api'

export interface CodingProject {
  workspace: CodingWorkspace
  sessions: CodingSession[]
  trees: CodingWorktree[]
}

export const useCodingCatalog = (includeTrees = false) => {
  const [projects, setProjects] = useState<CodingProject[]>([])
  const [details, setDetails] = useState<Map<string, AISession>>(new Map())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [sessionError, setSessionError] = useState('')
  const request = useRef(0)
  const refresh = useMemoizedFn(async () => {
    const version = ++request.current
    setLoading(true)
    setError('')
    setSessionError('')
    try {
      const { Data } = await queryCodingWorkspaces()
      const next = await Promise.all(
        (Data || []).map(async (workspace) => {
          const [sessions, trees] = await Promise.all([
            listCodingSessions(workspace.ID),
            includeTrees ? listCodingWorktrees(workspace.ID) : Promise.resolve({ Data: [] }),
          ])
          return { workspace, sessions: sessions.Data || [], trees: trees.Data || [] }
        }),
      )
      if (version !== request.current) return
      setProjects(next)
      const ids = [
        ...new Set(
          next.flatMap(({ sessions }) =>
            sessions.filter((s) => !(Number(s.SessionDeletedAt) > 0)).map((s) => s.SessionID),
          ),
        ),
      ]
      try {
        const result = ids.length ? await queryCodingSessionDetails(ids) : { Data: [] }
        if (version === request.current)
          setDetails(new Map((result.Data || []).map((session) => [session.SessionID, session])))
      } catch (err) {
        if (version === request.current) {
          setDetails(new Map())
          setSessionError(String(err))
        }
      }
    } catch (err) {
      if (version === request.current) setError(String(err))
    } finally {
      if (version === request.current) setLoading(false)
    }
  })
  useEffect(() => {
    void refresh()
    let timer: ReturnType<typeof setTimeout>
    const scheduleRefresh = () => {
      clearTimeout(timer)
      timer = setTimeout(refresh, 200)
    }
    emiter.on('sessionData', scheduleRefresh)
    window.addEventListener('focus', scheduleRefresh)
    return () => {
      ++request.current
      clearTimeout(timer)
      emiter.off('sessionData', scheduleRefresh)
      window.removeEventListener('focus', scheduleRefresh)
    }
  }, [refresh])
  return { projects, details, loading, error, sessionError, refresh }
}

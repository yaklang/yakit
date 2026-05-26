import { grpcQueryAISession } from '@/pages/ai-agent/grpc'
import type { AISession } from '@/pages/ai-agent/type/aiChat'
import { AISource } from '@/pages/ai-re-act/hooks/grpcApi'
import useGetSetState from '@/pages/pluginHub/hooks/useGetSetState'
import { useCreation, useMemoizedFn } from 'ahooks'
import { cloneDeep } from 'lodash'
import { useRef } from 'react'

interface SessionListState {
  sessions: AISession[]
}

export interface SessionListDispatcher {
  getSessions?: () => AISession[]
  setSessions: (sessions: AISession[] | ((prev: AISession[]) => AISession[])) => void
  refreshSession: (sessionId: string) => Promise<void>
  loadHistoryData: (isRefresh?: boolean) => Promise<number>
  resetPagination: () => void
}

const initialHistoryPagination = {
  Page: 1,
  Limit: 10,
  OrderBy: 'last_used_at',
  Order: 'desc',
  total: 0,
}

const mergeUniqueChats = (prev: AISession[], next: AISession[]) => {
  if (!next.length) return prev

  const sessionIds = new Set(prev.map((item) => item.SessionID))
  const uniqueNext = next.filter((item) => !sessionIds.has(item.SessionID))
  return uniqueNext.length ? [...prev, ...uniqueNext] : prev
}

const useSessionList = (aiSource: AISource[]) => {
  const [_, setPagination, getPagination] = useGetSetState(cloneDeep(initialHistoryPagination))
  const [sessions, setSessions, getSessions] = useGetSetState<AISession[]>([])
  const historyLoadingRef = useRef(false)

  const refreshSession = useMemoizedFn(async (sessionId: string) => {
    // 本来就在第一个，不需要重复请求
    if (getSessions().at(0)?.SessionID === sessionId) return
    try {
      const { Data } = await grpcQueryAISession({
        Pagination: initialHistoryPagination,
        Filter: {
          Source: aiSource,
          SessionID: [sessionId],
        },
      })
      setSessions((prev) => {
        const filterData = prev.filter((item) => item.SessionID !== sessionId)
        return [...Data, ...filterData]
      })
    } catch {}
  })

  const loadHistoryData = useMemoizedFn(async (isRefresh?: boolean): Promise<number> => {
    if (historyLoadingRef.current) {
      return getPagination().total || 0
    }

    const currentPagination = isRefresh ? { ...initialHistoryPagination } : getPagination()

    if (!isRefresh) {
      const currentChats = getSessions()
      if (currentPagination.total > 0 && currentChats.length >= currentPagination.total) {
        return currentPagination.total
      }
    }

    historyLoadingRef.current = true
    try {
      const { Data, Total } = await grpcQueryAISession({
        Pagination: currentPagination,
        Filter: {
          Source: aiSource,
        },
      })
      if (isRefresh) {
        setSessions(Data)
        setPagination({ ...initialHistoryPagination, Page: 2, total: Total })
      } else {
        setSessions((prev) => mergeUniqueChats(prev, Data))
        setPagination({
          ...currentPagination,
          Page: currentPagination.Page + 1,
          total: Total,
        })
      }
      return Total
    } catch {
      return currentPagination.total || 0
    } finally {
      historyLoadingRef.current = false
    }
  })

  const resetPagination = useMemoizedFn(() => {
    setPagination(cloneDeep(initialHistoryPagination))
  })

  const state: SessionListState = useCreation(() => {
    return {
      sessions,
    }
  }, [sessions])

  const dispatcher: SessionListDispatcher = useCreation(() => {
    return {
      getSessions,
      setSessions,
      refreshSession,
      loadHistoryData,
      resetPagination,
    }
  }, [])

  return [state, dispatcher] as const
}

export default useSessionList

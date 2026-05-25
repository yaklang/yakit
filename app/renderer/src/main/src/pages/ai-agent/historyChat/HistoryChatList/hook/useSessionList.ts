import { grpcQueryAISession } from '@/pages/ai-agent/grpc'
import type { AISession } from '@/pages/ai-agent/type/aiChat'
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
  loadHistoryData: (sessionData?: string) => Promise<number>
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

const useSessionList = () => {
  const [_, setPagination, getPagination] = useGetSetState(cloneDeep(initialHistoryPagination))
  const [sessions, setSessions, getSessions] = useGetSetState<AISession[]>([])
  const historyLoadingRef = useRef(false)
  const loadHistoryData = useMemoizedFn(async (sessionData?: string): Promise<number> => {
    if (sessionData) {
      // 本来就在第一个，不需要重复请求
      if (getSessions().at(0)?.SessionID === sessionData) return 0
      try {
        const { Data } = await grpcQueryAISession({
          Pagination: initialHistoryPagination,
          Filter: {
            Source: ['ai', ''],
            SessionID: [sessionData],
          },
        })
        setSessions((prev) => {
          const filterData = prev.filter((item) => item.SessionID !== sessionData)
          return [...Data, ...filterData]
        })
        return 0
      } catch {
        return 0
      }
    } else {
      if (historyLoadingRef.current) {
        return getPagination().total || 0
      }

      const currentPagination = getPagination()
      const currentChats = getSessions()
      if (currentPagination.total > 0 && currentChats.length >= currentPagination.total) {
        return currentPagination.total
      }

      historyLoadingRef.current = true
      try {
        const { Data, Total } = await grpcQueryAISession({
          Pagination: currentPagination,
          Filter: {
            Source: ['ai', ''],
          },
        })
        setSessions((prev) => mergeUniqueChats(prev, Data))
        setPagination({
          ...currentPagination,
          Page: currentPagination.Page + 1,
          total: Total,
        })
        return Total
      } catch {
        return currentPagination.total || 0
      } finally {
        historyLoadingRef.current = false
      }
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
      loadHistoryData,
      resetPagination,
    }
  }, [])

  return [state, dispatcher] as const
}

export default useSessionList

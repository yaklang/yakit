import { useEffect, useMemo, useRef } from 'react'
import { useMemoizedFn } from 'ahooks'
import { useStore } from 'zustand'
import { v4 as uuidv4 } from 'uuid'
import useAIAgentDispatcher from '@/pages/ai-agent/useContext/useDispatcher'
import { AIInputEventSyncTypeEnum } from './grpcApi'
import { useCurrentRawData, useCurrentStore } from './useCurrentDataBySession'
import useCurrentSessionId from './useCurrentSessionId'
import { useSyncLoadingState } from './useSyncLoadingState'

/** 时间线窗口打开且连接就绪时获取 Dump。 */
export const useTimelineDump = () => {
  const sessionId = useCurrentSessionId()
  const { onSend } = useAIAgentDispatcher()
  const store = useCurrentStore()
  const rawData = useCurrentRawData()
  const timelineDumpUpdate = useStore(store, (state) => state.timelineDumpUpdate)
  const dump = useMemo(() => rawData.timelineDump, [rawData, timelineDumpUpdate])
  const ready = useStore(store, (state) => state.execute && !state.initLoading && !state.grpcLoadMoreLoading)
  const { loading, markSending } = useSyncLoadingState()
  const requested = useRef(false)

  const refreshDump = useMemoizedFn(() => {
    if (!sessionId || !ready || loading) return
    const syncId = uuidv4()
    markSending(syncId)
    onSend({
      token: sessionId,
      type: '',
      params: {
        IsSyncMessage: true,
        SyncType: AIInputEventSyncTypeEnum.SYNC_TYPE_TIMELINE,
        SyncID: syncId,
        SyncJsonInput: JSON.stringify({ limit: 50 }),
      },
    })
  })

  useEffect(() => {
    if (requested.current || !sessionId || !ready) return
    requested.current = true
    refreshDump()
  }, [sessionId, ready, refreshDump])

  return { dump, loading, ready, refreshDump }
}

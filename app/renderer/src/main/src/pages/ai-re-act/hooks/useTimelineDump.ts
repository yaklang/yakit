import { useEffect, useRef } from 'react'
import { useStore } from 'zustand'
import { useMemoizedFn } from 'ahooks'
import { v4 as uuid } from 'uuid'
import useCurrentSessionId from './useCurrentSessionId'
import { useCurrentRawData, useCurrentStore } from './useCurrentDataBySession'
import useDispatcher from '@/pages/ai-agent/useContext/useDispatcher'
import { AIInputEventSyncTypeEnum } from './grpcApi'
export const useTimelineDump = () => {
  const id = useCurrentSessionId(),
    raw = useCurrentRawData(),
    store = useCurrentStore(),
    { onSend } = useDispatcher()
  const version = useStore(store, (s) => s.timelineDumpUpdate)
  const ready = useStore(store, (s) => s.execute && !s.initLoading && !s.grpcLoadMoreLoading)
  const timer = useRef<ReturnType<typeof setTimeout>>()
  const refreshDump = useMemoizedFn(() => {
    if (!id || !ready || raw.timelineDumpSyncID) return
    const token = uuid()
    raw.timelineDumpSyncID = token
    raw.timelineDumpError = undefined
    if (
      onSend({
        token: id,
        type: '',
        params: {
          IsSyncMessage: true,
          SyncType: AIInputEventSyncTypeEnum.SYNC_TYPE_TIMELINE,
          SyncID: token,
          SyncJsonInput: JSON.stringify({ limit: 50 }),
        },
      }) === false
    ) {
      raw.timelineDumpSyncID = undefined
      raw.timelineDumpError = 'send'
      store.getState().updateStateCount('timelineDumpUpdate')
      return
    }
    store.getState().updateStateCount('timelineDumpUpdate')
    clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      if (raw.timelineDumpSyncID === token) {
        raw.timelineDumpSyncID = undefined
        raw.timelineDumpError = 'timeout'
        store.getState().updateStateCount('timelineDumpUpdate')
      }
    }, 10000)
  })
  useEffect(() => {
    refreshDump()
    return () => {
      clearTimeout(timer.current)
      raw.timelineDumpSyncID = undefined
    }
  }, [id, raw, ready])
  void version
  return {
    dump: raw.timelineDump ?? '',
    loading: !!raw.timelineDumpSyncID,
    ready,
    error: raw.timelineDumpError,
    refreshDump,
  }
}

import { useEffect, useMemo, useRef, useState } from 'react'
import { useMemoizedFn } from 'ahooks'
import { useStore } from 'zustand'
import { useCurrentStore, useCurrentMeta } from './useCurrentDataBySession'
import type { AIAgentChatMetaData } from '@/pages/ai-agent/type/aiChat'

/** 操作按钮 loading 的最短展示时长：回执快于该值时延至满 200ms 再关闭，避免闪烁 */
const MIN_SYNC_LOADING_MS = 200

/**
 * SyncID 回执驱动的按钮 loading：markSending 记录发送的 SyncID；
 * 后端未回执（syncIDMap 中仍存在）或未满最短展示时长时为 true，与老版
 * AIManualAddition.addAndToContextLoading 的回执机制一致，仅增加最短展示兜底
 */
export const useSyncLoadingState = () => {
  const meta = useCurrentMeta() as AIAgentChatMetaData
  const store = useCurrentStore()
  const syncIDUpdate = useStore(store, (state) => state.syncIDUpdate)

  const syncIdRef = useRef<string>('')
  const timerRef = useRef<ReturnType<typeof setTimeout>>()
  /** 最短展示期标记：markSending 置位，200ms 后定时器清除 */
  const [inGrace, setInGrace] = useState(false)

  // 后端未回执（syncIDMap 仍存在该 SyncID）时为 true；syncIDUpdate 变化（发出/回执）驱动重算
  const pending = useMemo(() => {
    return !!syncIdRef.current && !!meta.syncIDMap?.get(syncIdRef.current)
  }, [syncIDUpdate, meta])

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const markSending = useMemoizedFn((syncId: string) => {
    syncIdRef.current = syncId
    if (timerRef.current) clearTimeout(timerRef.current)
    setInGrace(true)
    timerRef.current = setTimeout(() => setInGrace(false), MIN_SYNC_LOADING_MS)
  })

  return { loading: pending || inGrace, markSending }
}

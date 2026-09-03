import { useEffect, useMemo, useRef, useState } from 'react'
import { useMemoizedFn } from 'ahooks'
import { useStore } from 'zustand'
import { useCurrentStore, useCurrentMeta } from './useCurrentDataBySession'
import type { AIAgentChatMetaData } from '@/pages/ai-agent/type/aiChat'

/** 按钮最短 loading 展示时长。消费方按钮 loading 时 antd 会使原生 button disabled，
 * 二次点击无法派发事件、debounce 尾沿不会被武装；该值只需覆盖消费方的 debounce
 * 窗口（200ms）并留出余量，防止回执过快时 loading 过早结束 */
const MIN_SYNC_LOADING_MS = 300

/**
 * SyncID 回执驱动的按钮 loading：markSending 记录发送的 SyncID；
 * 后端未回执（syncIDMap 中仍存在）或未满最短展示时长（300ms，为消费方 200ms
 * debounce 窗口之上的余量，配合按钮 loading 期的原生 disabled 防止二次触发）时为 true。
 */
export const useSyncLoadingState = () => {
  const meta = useCurrentMeta() as AIAgentChatMetaData
  const store = useCurrentStore()
  const syncIDUpdate = useStore(store, (state) => state.syncIDUpdate)

  const syncIdRef = useRef<string>('')
  const timerRef = useRef<ReturnType<typeof setTimeout>>()
  /** 最短展示期标记：markSending 置位，满 MIN_SYNC_LOADING_MS 后定时器清除 */
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

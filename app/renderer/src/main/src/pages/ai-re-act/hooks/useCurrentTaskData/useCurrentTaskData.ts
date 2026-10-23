import { useCreation, useDebounceFn } from 'ahooks'
import { useEffect, useState } from 'react'
import { useStore } from 'zustand'
import type { PlanItemDetailsData } from '../aiRender'
import { useCurrentRawData, useCurrentStore } from '../useCurrentDataBySession'
import useCurrentSessionId from '../useCurrentSessionId'

/**
 * 读取当前会话的任务详情，监听 store 更新并防抖刷新，默认最长等待 3000ms。
 * 首次及切换任务、会话时立即读取；返回原始引用。
 */
const useCurrentTaskData = (taskId: string, debounceMs = 3000): PlanItemDetailsData | undefined => {
  const sessionId = useCurrentSessionId()
  const rawData = useCurrentRawData()
  const store = useCurrentStore()
  const taskDetailsUpdate = useStore(store, (state) => state.taskDetailsUpdate)

  // 区分缺失条目与空 uuid 条目
  const [detailsSignal, setDetailsSignal] = useState('missing')

  const getData = useDebounceFn(
    () => {
      const taskData = taskId ? rawData.taskDetailsMap.get(taskId) : undefined
      const nextSignal = taskData ? `present:${taskData.uuid}` : 'missing'
      setDetailsSignal((previous) => (previous === nextSignal ? previous : nextSignal))
    },
    { wait: debounceMs, maxWait: debounceMs, leading: true },
  ).run
  useEffect(() => {
    return () => getData.cancel()
  }, [sessionId, taskId, store])
  useEffect(() => {
    getData()
  }, [sessionId, taskId, store, taskDetailsUpdate])

  return useCreation(() => {
    if (!taskId) return undefined
    return rawData.taskDetailsMap.get(taskId)
  }, [sessionId, taskId, detailsSignal])
}

export default useCurrentTaskData

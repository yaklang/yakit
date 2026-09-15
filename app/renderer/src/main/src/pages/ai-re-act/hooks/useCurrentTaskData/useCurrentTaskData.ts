import { useCreation, useInterval, useMemoizedFn } from 'ahooks'
import { useEffect, useState } from 'react'
import type { PlanItemDetailsData } from '../aiRender'
import { useCurrentRawData } from '../useCurrentDataBySession'
import useCurrentSessionId from '../useCurrentSessionId'

/**
 * 根据外部传入的 taskId，从当前会话的 taskDetailsMap 读取任务详情。
 * taskDetailsMap 由流事件原地更新（不触发渲染），靠轮询比对条目是否存在和 uuid 感知变化，
 * 信号不变时引用稳定。轮询间隔单位为秒，默认 3 秒。
 * 返回 map 里的活引用，需要不可变快照的调用方请自行 cloneDeep。
 */
const useCurrentTaskData = (taskId: string, intervalSeconds = 3): PlanItemDetailsData | undefined => {
  const sessionId = useCurrentSessionId()
  const rawData = useCurrentRawData()

  // 条目存在性和 uuid 共同构成变更信号，避免“缺失条目”和“默认空 uuid 条目”无法区分
  const [detailsSignal, setDetailsSignal] = useState('missing')

  useEffect(() => {
    onReset()
    getData()
  }, [sessionId, taskId])

  useInterval(() => {
    getData()
  }, intervalSeconds * 1000)

  const onReset = useMemoizedFn(() => {
    setDetailsSignal('missing')
  })
  const getData = useMemoizedFn(() => {
    const taskData = taskId ? rawData.taskDetailsMap.get(taskId) : undefined
    const nextSignal = taskData ? `present:${taskData.uuid}` : 'missing'
    setDetailsSignal((previous) => (previous === nextSignal ? previous : nextSignal))
  })

  return useCreation(() => {
    if (!taskId) return undefined
    return rawData.taskDetailsMap.get(taskId)
  }, [sessionId, taskId, detailsSignal])
}

export default useCurrentTaskData

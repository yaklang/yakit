import { useEffect, useRef } from 'react'
import { useMemoizedFn } from 'ahooks'
import emiter from '@/utils/eventBus/eventBus'

const LOCATE_READY_DELAY = 80

export interface TaskPlanTabItem {
  value: string
}

interface UseEnsureTaskPlanLocateParams {
  taskContentKey: string
  activeKey: string
  taskPlanMounted: boolean
  tabsLength: number
  /** 是否有可展示的规划内容 */
  hasPlanContent: boolean
  getTabs: () => TaskPlanTabItem[]
  ensurePlanTab: () => void
  setActiveKey: (key: string) => void
}

/**
 * 任务树定位：保证「深度规划」可见后，再发 Ready 事件触发列表定位/高亮。
 * - 请求事件：onAITreeLocatePlanningList
 * - 就绪事件：onAITreeLocatePlanningListReady（仅列表侧监听）
 */
export const useEnsureTaskPlanLocate = (params: UseEnsureTaskPlanLocateParams) => {
  const {
    taskContentKey,
    activeKey,
    taskPlanMounted,
    tabsLength,
    hasPlanContent,
    getTabs,
    ensurePlanTab,
    setActiveKey,
  } = params

  const pendingLocateIdRef = useRef<string>()

  const isPlanVisible = useMemoizedFn(() => {
    const inTabs = getTabs().some((item) => item.value === taskContentKey)
    return inTabs && activeKey === taskContentKey && taskPlanMounted && tabsLength > 0
  })

  const emitLocateReady = useMemoizedFn((id: string) => {
    emiter.emit('onAITreeLocatePlanningListReady', id)
  })

  const onLocateRequest = useMemoizedFn((id?: string) => {
    if (!id) return
    if (!hasPlanContent && !taskPlanMounted) return

    // 已展示：直接通知列表定位
    if (isPlanVisible()) {
      emitLocateReady(id)
      return
    }

    pendingLocateIdRef.current = id
    ensurePlanTab()
    setActiveKey(taskContentKey)
  })

  useEffect(() => {
    emiter.on('onAITreeLocatePlanningList', onLocateRequest)
    return () => {
      emiter.off('onAITreeLocatePlanningList', onLocateRequest)
    }
  }, [])

  useEffect(() => {
    const id = pendingLocateIdRef.current
    if (!id) return
    if (activeKey !== taskContentKey || !taskPlanMounted || !tabsLength) return

    const timer = window.setTimeout(() => {
      // emit 后再清，避免 cleanup 清掉 timer 时丢 pending
      if (pendingLocateIdRef.current !== id) return
      pendingLocateIdRef.current = undefined
      emitLocateReady(id)
    }, LOCATE_READY_DELAY)

    return () => window.clearTimeout(timer)
  }, [activeKey, taskPlanMounted, tabsLength, taskContentKey])
}

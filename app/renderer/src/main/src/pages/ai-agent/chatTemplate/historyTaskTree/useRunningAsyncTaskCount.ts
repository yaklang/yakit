import { useCreation } from 'ahooks'
import { useStore } from 'zustand'
import { useCurrentStore } from '@/pages/ai-re-act/hooks/useCurrentDataBySession'
import type { AITaskInfoProps } from '@/pages/ai-re-act/hooks/aiRender'
import { AITaskStatus } from '@/pages/ai-re-act/hooks/grpcApi'
import { useCasualConcurrentTaskList } from './useHasTaskTree'

/** 当前规划的可执行子任务，按当前规划内的 task_id 去重。 */
export const useAsyncTaskStates = () => {
  const store = useCurrentStore()
  const taskTree = useStore(store, (state) => state.currentPlan.task_tree)

  return useCreation(() => {
    const tasks = new Map<string, AITaskInfoProps>()
    for (const task of taskTree) {
      if (!task.task_id || !task.isLeaf || task.isRemove) continue
      tasks.set(task.task_id, task)
    }

    return Array.from(tasks.values())
  }, [store, taskTree])
}

export interface AsyncTaskCount {
  /** 规划叶子 + 子 Agent 总条数，用于入口显隐 */
  total: number
  /** processing 数量，用于角标 */
  running: number
}

/** 汇总规划子任务和子 Agent：total 不过滤状态，running 只计执行中。 */
const useRunningAsyncTaskCount = (): AsyncTaskCount => {
  const asyncTasks = useAsyncTaskStates()
  const subAgentTasks = useCasualConcurrentTaskList()
  return useCreation(() => {
    const tasks = [...asyncTasks, ...subAgentTasks]
    return {
      total: tasks.length,
      running: tasks.filter((task) => task.progress === AITaskStatus.inProgress).length,
    }
  }, [asyncTasks, subAgentTasks])
}

export default useRunningAsyncTaskCount

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

/** 根据本地任务状态，汇总执行中的规划子任务和子 Agent 数量。 */
const useRunningAsyncTaskCount = () => {
  const asyncTasks = useAsyncTaskStates()
  const subAgentTasks = useCasualConcurrentTaskList()
  // 两类任务分别统计 processing 状态，再相加。
  const runningTaskCount = asyncTasks.filter((task) => task.progress === AITaskStatus.inProgress).length
  const runningAgentCount = subAgentTasks.filter((task) => task.progress === AITaskStatus.inProgress).length
  return runningTaskCount + runningAgentCount
}

export default useRunningAsyncTaskCount

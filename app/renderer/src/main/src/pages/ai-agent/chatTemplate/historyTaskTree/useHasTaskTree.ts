import { useCreation } from 'ahooks'
import { useStore } from 'zustand'
import { useCurrentRawData, useCurrentStore } from '@/pages/ai-re-act/hooks/useCurrentDataBySession'
import useAIItemKind from '@/pages/ai-re-act/hooks/useAIItemKind'
import { AIChatQSDataTypeEnum, type AITaskInfoProps } from '@/pages/ai-re-act/hooks/aiRender'

/** 与 AIReActSubAgentTask 同源：reAct + kind=task + TASK_NODE_GROUP */
export const useCasualConcurrentTaskList = () => {
  const store = useCurrentStore()
  const rawData = useCurrentRawData()
  const getKind = useAIItemKind()
  const casualChatElementLength = useStore(store, (state) => state.chatElements.length || 0)
  const taskRenderVersion = useStore(store, (state) => {
    let version = 0
    for (const item of state.chatElements) {
      if (item.chatType !== 'reAct') continue
      const task = state.tasks[item.token]
      if (task) version += task.renderNum
    }
    return version
  })

  return useCreation(() => {
    const list: AITaskInfoProps[] = []
    const elements = store.getState().chatElements || []
    for (const item of elements) {
      if (item.chatType !== 'reAct') continue
      if (getKind(item.token) !== 'task') continue
      const itemContent = rawData.contents.get(item.token)
      if (itemContent?.type !== AIChatQSDataTypeEnum.TASK_NODE_GROUP) continue
      const data = itemContent.data
      list.push({
        task_id: data?.taskId || item.token,
        name: data?.taskName || data?.goal || item.token,
        goal: data?.goal || '',
        level: 2,
        isLeaf: true,
        semantic_identifier: '',
        isRemove: false,
        tools: [],
        description: '',
        total_tool_call_count: 0,
        success_tool_call_count: 0,
        fail_tool_call_count: 0,
        summary: '',
        progress: data?.status,
      })
    }
    return list
  }, [casualChatElementLength, taskRenderVersion])
}

/** 有任务树或子 Agent 任务时，任务列表入口可点 */
export const useHasTaskTree = () => {
  const store = useCurrentStore()
  const taskTree = useStore(store, (state) => state.currentPlan.task_tree ?? [])
  const casualConcurrentTaskList = useCasualConcurrentTaskList()
  return taskTree.length > 0 || casualConcurrentTaskList.length > 0
}

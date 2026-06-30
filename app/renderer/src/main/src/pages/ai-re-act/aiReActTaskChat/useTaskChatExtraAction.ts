import { useCreation, useMemoizedFn } from 'ahooks'
import useChatIPCStore from '@/pages/ai-agent/useContext/ChatIPCContent/useStore'
import useChatIPCDispatcher from '@/pages/ai-agent/useContext/ChatIPCContent/useDispatcher'
import { AIReviewType } from '../hooks/aiRender'
import { AIInputEventSyncTypeEnum } from '../hooks/grpcApi'

export const useTaskChatExtraAction = () => {
  const { reviewInfo, chatIPCData } = useChatIPCStore()
  const { handleSendSyncMessage, chatIPCEvents } = useChatIPCDispatcher()

  const taskStatus = useCreation(() => chatIPCData.taskStatus, [chatIPCData.taskStatus])

  const getTaskInfo = useMemoizedFn(() => chatIPCEvents.fetchCurrentTaskPlanID())
  const getTaskId = useMemoizedFn(() => getTaskInfo()?.taskID)

  const onSendPlayHistoryList = useMemoizedFn(() => {
    chatIPCData.execute && handleSendSyncMessage({ syncType: AIInputEventSyncTypeEnum.SYNC_TYPE_PLAN_EXEC_TASKS })
  })
  /**取消当前指定任务 */
  const onStopTask = useMemoizedFn(() => {
    const taskId = getTaskId()
    if (!taskId) return
    handleSendSyncMessage({
      syncType: AIInputEventSyncTypeEnum.SYNC_TYPE_REACT_CANCEL_TASK,
      SyncJsonInput: JSON.stringify({ task_id: taskId }),
    })
    if (!!reviewInfo) {
      chatIPCEvents.handleTaskReviewRelease((reviewInfo.data as AIReviewType).id)
    }
    onSendPlayHistoryList()
  })
  /**取消当前执行的子任务 */
  const onStopSubTask = useMemoizedFn((syncID: string) => {
    handleSendSyncMessage({
      syncType: AIInputEventSyncTypeEnum.SYNC_TYPE_SKIP_SUBTASK_IN_PLAN,
      SyncJsonInput: JSON.stringify({ reason: '用户认为这个任务不需要执行', skip_current_task: true }),
      syncID,
    })
    if (!!reviewInfo) {
      chatIPCEvents.handleTaskReviewRelease((reviewInfo.data as AIReviewType).id)
    }
    setTimeout(() => {
      onSendPlayHistoryList()
    }, 500)
  })

  const onRecover = useMemoizedFn(() => {
    const info = getTaskInfo()
    const coordinatorId = info?.coordinatorId
    const taskId = info?.taskID
    if (!coordinatorId) return
    if (taskStatus.loading && taskId) {
      handleSendSyncMessage({
        syncType: AIInputEventSyncTypeEnum.SYNC_TYPE_REACT_CANCEL_TASK,
        SyncJsonInput: JSON.stringify({ task_id: taskId }),
      })
    }

    setTimeout(() => {
      handleSendSyncMessage({
        syncType: AIInputEventSyncTypeEnum.SYNC_TYPE_RECOVERY_PLAN_AND_EXEC,
        SyncJsonInput: JSON.stringify({ coordinator_id: coordinatorId }),
      })
      chatIPCEvents.resetCurrentTaskPlanID()
    }, 200)
    if (!!reviewInfo) {
      chatIPCEvents.handleTaskReviewRelease((reviewInfo.data as AIReviewType).id)
    }
  })

  const onExtraAction = useMemoizedFn((type: 'stopTask' | 'stopSubTask' | 'recover', syncID: string) => {
    switch (type) {
      case 'stopTask':
        onStopTask()
        break
      case 'stopSubTask':
        onStopSubTask(syncID)
        break
      case 'recover':
        onRecover()
        break
      default:
        break
    }
  })

  return { onExtraAction, getTaskId }
}

import { useMemoizedFn } from 'ahooks'
import { AIInputEvent, AIInputEventSyncTypeEnum } from '../hooks/grpcApi'
import useCurrentSessionId from '../hooks/useCurrentSessionId'
import useAIAgentDispatcher from '@/pages/ai-agent/useContext/useDispatcher'
import { randomString } from '@/utils/randomUtil'
import { useStore } from 'zustand'
import { useCurrentStore, useCurrentMeta } from '../hooks/useCurrentDataBySession'

/**
 * 只适用于任务规划的content footer下，不适用于子任务的上的继续
 * TODO -需要更新为最新的
 */
export const useTaskChatExtraAction = () => {
  /** TODO - 数据未对接 */
  // const { reviewInfo, chatIPCData } = useChatIPCStore()

  const { onSend } = useAIAgentDispatcher()

  const sessionId = useCurrentSessionId()
  const store = useCurrentStore()
  const meta = useCurrentMeta()
  const taskStatus = useStore(store, (state) => state.taskStatus)
  const execute = useStore(store, (state) => state.execute)

  const sendReactCancelTask = useMemoizedFn(() => {
    const taskId = meta.currentTaskPlanID?.taskID
    if (!taskId) return

    const info: AIInputEvent = {
      IsSyncMessage: true,
      SyncType: AIInputEventSyncTypeEnum.SYNC_TYPE_REACT_CANCEL_TASK,
      SyncJsonInput: JSON.stringify({ task_id: taskId }),

      SyncID: randomString(8),
    }
    onSend({ token: sessionId, type: 'task', params: info })
  })

  const onSendPlayHistoryList = useMemoizedFn(() => {
    if (execute) {
      const info: AIInputEvent = {
        IsSyncMessage: true,
        SyncType: AIInputEventSyncTypeEnum.SYNC_TYPE_PLAN_EXEC_TASKS,

        SyncID: randomString(8),
      }
      onSend({ token: sessionId, type: 'task', params: info })
    }
  })
  /**取消当前指定任务 */
  const onStopTask = useMemoizedFn(() => {
    sendReactCancelTask()
    /** TODO - */
    // if (!!reviewInfo) {
    //   chatIPCEvents.handleTaskReviewRelease((reviewInfo.data as AIReviewType).id)
    // }
    onSendPlayHistoryList()
  })
  /**取消当前执行的子任务 */
  const onStopSubTask = useMemoizedFn((syncID: string) => {
    const info: AIInputEvent = {
      IsSyncMessage: true,
      SyncType: AIInputEventSyncTypeEnum.SYNC_TYPE_SKIP_SUBTASK_IN_PLAN,
      SyncJsonInput: JSON.stringify({ reason: '用户认为这个任务不需要执行', skip_current_task: true }),

      SyncID: randomString(8),
    }
    onSend({ token: sessionId, type: 'task', params: info })
    /** TODO - */
    // if (!!reviewInfo) {
    //   chatIPCEvents.handleTaskReviewRelease((reviewInfo.data as AIReviewType).id)
    // }
    setTimeout(() => {
      onSendPlayHistoryList()
    }, 500)
  })

  /** @description 在任务规划的content footer下,继续按钮的出现在UI上意味着该任务肯定已经停止 */
  const onRecover = useMemoizedFn(() => {
    const info = meta.currentTaskPlanID
    const coordinatorId = info?.coordinatorId
    if (!coordinatorId) return

    const params: AIInputEvent = {
      IsSyncMessage: true,
      SyncType: AIInputEventSyncTypeEnum.SYNC_TYPE_RECOVERY_PLAN_AND_EXEC,
      SyncJsonInput: JSON.stringify({ coordinator_id: coordinatorId }),
      SyncID: randomString(8),
    }
    onSend({ token: sessionId, type: 'task', params })
    meta.currentTaskPlanID = undefined

    /** TODO - */
    // if (!!reviewInfo) {
    //   chatIPCEvents.handleTaskReviewRelease((reviewInfo.data as AIReviewType).id)
    // }
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

  return { onExtraAction }
}

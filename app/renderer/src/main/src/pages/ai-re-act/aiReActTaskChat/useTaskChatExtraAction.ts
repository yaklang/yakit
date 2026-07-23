import { type AIInputEvent, AIInputEventSyncTypeEnum } from '../hooks/grpcApi'
import useCurrentSessionId from '../hooks/useCurrentSessionId'
import useAIAgentDispatcher from '@/pages/ai-agent/useContext/useDispatcher'
import { randomString } from '@/utils/randomUtil'
import { useStore } from 'zustand'
import { useCurrentStore, useCurrentMeta, useCurrentRawData } from '../hooks/useCurrentDataBySession'
import useCreation from 'ahooks/lib/useCreation'
import useMemoizedFn from 'ahooks/lib/useMemoizedFn'
import { globalSessionEngine } from '../hooks/ChatMultiSessionController'

/**
 * 只适用于任务规划的content footer下，不适用于子任务的上的继续
 */
export const useTaskChatExtraAction = () => {
  const { onSend } = useAIAgentDispatcher()

  const sessionId = useCurrentSessionId()
  const store = useCurrentStore()

  const rawData = useCurrentRawData()
  const meta = useCurrentMeta()
  const execute = useStore(store, (state) => state.execute)

  const currentPlanReviewToken = useStore(store, (state) => state.currentPlanReviewToken)

  const reviewInfo = useCreation(() => {
    return rawData.contents.get(currentPlanReviewToken.token)
  }, [currentPlanReviewToken.renderNum])

  /**
   * 停止任务后会返回结束标识，然后清空review id
   * 防止hooks出现意外，UI层暂时保留该逻辑
   */
  const closeChatReview = useMemoizedFn(() => {
    if (!!reviewInfo) {
      globalSessionEngine.closeChatReview(sessionId, reviewInfo.id)
    }
  })

  const sendReactCancelTask = useMemoizedFn(() => {
    const taskId = meta.currentTaskPlanID?.taskID
    if (!taskId) return
    store.getState().updateState({
      cancelTaskLoading: true,
    })
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
    closeChatReview()
    onSendPlayHistoryList()
  })
  /**取消当前执行的子任务 */
  const onStopSubTask = useMemoizedFn(() => {
    const info: AIInputEvent = {
      IsSyncMessage: true,
      SyncType: AIInputEventSyncTypeEnum.SYNC_TYPE_SKIP_SUBTASK_IN_PLAN,
      SyncJsonInput: JSON.stringify({ reason: '用户认为这个任务不需要执行', skip_current_task: true }),

      SyncID: randomString(8),
    }
    onSend({ token: sessionId, type: 'task', params: info })
    /** 目前多任务并发，出现子任务后review自动走的继续执行，不会出现review */
    closeChatReview()
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
    closeChatReview()
  })

  const onExtraAction = useMemoizedFn((type: 'stopTask' | 'stopSubTask' | 'recover') => {
    switch (type) {
      case 'stopTask':
        onStopTask()
        break
      case 'stopSubTask':
        onStopSubTask()
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

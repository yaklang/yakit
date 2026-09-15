import { useCreation } from 'ahooks'
import type { AIAgentGrpcApi } from '../grpcApi'
import useCurrentSessionId from '../useCurrentSessionId'
import useCurrentTaskData from './useCurrentTaskData'

/** 根据外部传入的 taskId，读取当前会话任务详情中最近一次 session_snapshot 的 execution；会话、任务或 uuid 变化时重新取值。 */
const useCurrentTaskExecution = (
  taskId: string,
  intervalSeconds = 3,
): AIAgentGrpcApi.SessionSnapshot['execution'] | undefined => {
  const sessionId = useCurrentSessionId()
  const taskData = useCurrentTaskData(taskId, intervalSeconds)
  // taskDetailsMap 中的条目会原地更新，使用会话、任务和 uuid 作为变更信号，避免继续持有旧 execution 引用。
  return useCreation(() => taskData?.execution, [sessionId, taskId, taskData?.uuid])
}

export default useCurrentTaskExecution

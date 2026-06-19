import { AIAgentGrpcApi } from '@/pages/ai-re-act/hooks/grpcApi'
import { AITreeNodeProps } from '../../aiTree/type'

export interface HistoryTaskTreeProps {
  /** 当前任务 */
  currentTaskItem: AIAgentGrpcApi.PlanHistory
  // 历史任务数据源
  data: AIAgentGrpcApi.PlanHistoryList
}

export interface HistoryTaskTreeItemProps {
  // 历史任务的单条记录
  item: AIAgentGrpcApi.PlanHistory
  /** 当前任务id */
  currentCoordinatorId: string
  taskType: AITreeNodeProps['taskType']
}

export interface AIHistoryContinueTaskProps {
  coordinatorId: string
  taskIndex: string
}

export interface SendRecoverParams {
  coordinatorId: string
  taskIndex: string
}

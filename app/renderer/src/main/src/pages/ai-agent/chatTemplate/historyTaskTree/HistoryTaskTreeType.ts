import { AIAgentGrpcApi } from '@/pages/ai-re-act/hooks/grpcApi'
import { AIChatLeft } from '../AIAgentChatTemplate'
import { AITaskInfoProps } from '@/pages/ai-re-act/hooks/aiRender'

export interface HistoryTaskTreeProps {
  // 历史任务数据源
  data: AIAgentGrpcApi.PlanHistoryList
}

export interface HistoryTaskTreeItemProps {
  // 历史任务的单条记录
  item: AIAgentGrpcApi.PlanHistory
}

export interface AIHistoryContinueTaskProps {
  coordinatorId: string
  taskIndex: string
}

export interface SendRecoverParams {
  coordinatorId: string
  taskIndex: string
}

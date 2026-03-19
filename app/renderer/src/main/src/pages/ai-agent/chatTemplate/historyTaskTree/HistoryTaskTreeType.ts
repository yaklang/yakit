import {AIAgentGrpcApi} from "@/pages/ai-re-act/hooks/grpcApi"

export interface HistoryTaskTreeProps {
    // 历史任务数据源
    data: AIAgentGrpcApi.PlanHistoryList
}

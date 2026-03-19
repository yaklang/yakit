import {AIAgentGrpcApi} from "@/pages/ai-re-act/hooks/grpcApi"
import {AIChatLeft} from "../AIAgentChatTemplate"

export interface HistoryTaskTreeProps {
    // 历史任务数据源
    data: AIAgentGrpcApi.PlanHistoryList
    handleTabChange: (v: AIChatLeft) => void
}

export interface HistoryTaskTreeItemProps {
    // 历史任务的单条记录
    item: AIAgentGrpcApi.PlanHistory
}

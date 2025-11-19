import {AIAgentGrpcApi} from "@/pages/ai-re-act/hooks/grpcApi"

export interface AITaskQueryProps {}

export interface AITaskQueryItemProps {
    item: AIAgentGrpcApi.QuestionQueueItem
}

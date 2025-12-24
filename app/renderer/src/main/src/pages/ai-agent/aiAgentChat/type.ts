import {AIChatQSData} from "@/pages/ai-re-act/hooks/aiRender"
import {AIAgentGrpcApi, AIInputEvent} from "@/pages/ai-re-act/hooks/grpcApi"
import {AIChatTextareaSubmit} from "../template/type"
import {AIChatIPCStartParams} from "@/pages/ai-re-act/hooks/type"

export interface AIAgentChatProps {}
export type AIAgentChatMode = "welcome" | "re-act" | "task"
export interface AIReActTaskChatReviewProps {
    reviewInfo: AIChatQSData
    planReviewTreeKeywordsMap: Map<string, AIAgentGrpcApi.PlanReviewRequireExtra>
    setScrollToBottom: (v: boolean) => void
    onStopTask: () => void
}

export interface HandleStartParams extends AIChatTextareaSubmit {
    qs: string
    attachedResourceInfo?: AIInputEvent["AttachedResourceInfo"]
    extraValue?: AIChatIPCStartParams["extraValue"]
}

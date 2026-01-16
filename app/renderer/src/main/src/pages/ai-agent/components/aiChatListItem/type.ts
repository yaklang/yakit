import type {ReActChatElement} from "@/pages/ai-re-act/hooks/aiRender"
import {AIAgentGrpcApi} from "@/pages/ai-re-act/hooks/grpcApi"
import {UseYakExecResultState} from "@/pages/ai-re-act/hooks/type"

export interface AIChatListItemProps {
    item: ReActChatElement
    type: "re-act" | "task-agent"
    tasksProps?: {tasks: AIAgentGrpcApi.PlanTask[]; yakExecResult: UseYakExecResultState}
}

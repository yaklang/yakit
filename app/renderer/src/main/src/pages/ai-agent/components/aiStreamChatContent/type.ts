import {AIOutputEvent} from "@/pages/ai-re-act/hooks/grpcApi"

export interface AIStreamChatContentProps {
    content: string
    nodeIdVerbose: AIOutputEvent["NodeIdVerbose"]
}

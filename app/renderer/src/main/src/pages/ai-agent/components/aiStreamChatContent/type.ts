import {AIOutputEvent} from "@/pages/ai-re-act/hooks/grpcApi"
import {ReactNode} from "react"

export interface AIStreamChatContentProps {
    content: string
    nodeIdVerbose: AIOutputEvent["NodeIdVerbose"]
    referenceNode?: ReactNode
}

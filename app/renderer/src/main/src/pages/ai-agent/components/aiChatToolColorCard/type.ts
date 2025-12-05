import {AIStreamOutput} from "@/pages/ai-re-act/hooks/aiRender"
import {ReactNode} from "react"

export interface AIChatToolColorCardProps {
    toolCall: AIStreamOutput
    referenceNode?: ReactNode
}

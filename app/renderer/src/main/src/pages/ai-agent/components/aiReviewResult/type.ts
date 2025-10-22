import {AIChatQSData} from "@/pages/ai-re-act/hooks/aiRender"
import {ReactNode} from "react"
import {ChatCardProps} from "../ChatCard"

export interface AIReviewResultProps {
    info: AIChatQSData
    timestamp: number
}
export interface AISingHaveColorTextProps extends ChatCardProps {
    title: ReactNode
    subTitle: ReactNode
    tip: ReactNode
    timestamp: number
}

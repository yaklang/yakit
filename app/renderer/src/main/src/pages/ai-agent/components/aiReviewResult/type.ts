import {AIChatQSData} from "@/pages/ai-re-act/hooks/aiRender"
import {ReactNode} from "react"
import {ChatCardProps} from "../ChatCard"
import {ModalInfoProps} from "../ModelInfo"

export interface AIReviewResultProps {
    info: AIChatQSData
    timestamp: number
}
export interface AISingHaveColorTextProps extends ChatCardProps {
    title: ReactNode
    subTitle: ReactNode
    tip: ReactNode
    modalInfo?: ModalInfoProps
    children?: ReactNode
}

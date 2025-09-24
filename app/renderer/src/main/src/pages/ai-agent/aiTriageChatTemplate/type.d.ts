import {RefObject} from "react"
import {AIForge} from "../AIForge/type"
import {AIStartParams} from "@/pages/ai-re-act/hooks/grpcApi"

export interface AIForgeInfoOptProps {
    info: AIForge
    activeForge?: AIForge
    onClick?: (info: AIForge) => void
}

export interface AIForgeFormProps {
    wrapperRef?: RefObject<HTMLDivElement>
    info: AIForge
    onBack: () => void
    onSubmit: (request: AIStartParams) => void
}

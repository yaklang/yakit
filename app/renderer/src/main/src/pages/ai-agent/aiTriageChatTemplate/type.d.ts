import {RefObject} from "react"
import {AIStartParams} from "@/pages/ai-re-act/hooks/grpcApi"
import {AIForge} from "../type/forge"
import {AITool} from "../type/aiTool"

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

export interface AIToolFormProps {
    wrapperRef?: RefObject<HTMLDivElement>
    info: AITool
    onBack: () => void
    onSubmit: () => void
}

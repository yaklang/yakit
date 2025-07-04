import {RefObject} from "react"
import {AIForge, AIStartParams} from "../type/aiChat"

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

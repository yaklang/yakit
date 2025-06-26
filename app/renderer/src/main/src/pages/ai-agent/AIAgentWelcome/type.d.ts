import {Dispatch, SetStateAction} from "react"
import {AIForge, AIStartParams} from "../type/aiChat"

export interface AIAgentWelcomeProps {
    question: string
    setQuestion: Dispatch<SetStateAction<string>>
    onSearch: (request: AIStartParams) => void
}

export interface AIForgeFormProps {
    info: AIForge
    onBack: () => void
    onSubmit: (request: AIStartParams) => void
}

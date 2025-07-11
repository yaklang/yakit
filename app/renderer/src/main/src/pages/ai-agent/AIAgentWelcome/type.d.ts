import {AIStartParams} from "../type/aiChat"

export interface AIAgentWelcomeProps {
    onTriageSubmit: (question: string) => void
    onTaskSubmit: (request: AIStartParams) => void
}

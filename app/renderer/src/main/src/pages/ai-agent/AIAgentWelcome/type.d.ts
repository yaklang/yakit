import {Dispatch, SetStateAction} from "react"

export interface AIAgentWelcomeProps {
    question: string
    setQuestion: Dispatch<SetStateAction<string>>
    onSearch: () => void
}

import {ReactNode} from "react"

export interface AITriageChatContentProps {
    isAnswer?: boolean
    loading?: boolean
    content: ReactNode
    contentClassName?: string
    chatClassName?: string
}

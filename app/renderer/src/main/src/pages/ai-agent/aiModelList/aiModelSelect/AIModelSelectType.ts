import {AIStartParams} from "@/pages/ai-re-act/hooks/grpcApi"
import {ReactNode} from "react"
import {AIModelConfig} from "../utils"
import { AIOnlineModelListProps } from "../AIModelListType"

export type AISelectType = "online" | "local"
export interface AIModelSelectProps {
    isOpen?: boolean
    className?: string
    mountContainer?: AIOnlineModelListProps['mountContainer']
}
export interface AIModelItemProps {
    value: string
    aiService: AIStartParams["AIService"]
    checked: boolean
}

export interface AIModelSelectListProps {
    title: ReactNode
    subTitle: ReactNode
    list: AIModelConfig[]
    onSelect: (v: AIModelConfig, i: number) => void
}

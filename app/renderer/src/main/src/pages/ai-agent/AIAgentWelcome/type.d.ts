import {AIStartParams} from "@/pages/ai-re-act/hooks/grpcApi"
import {Dispatch, ForwardedRef, SetStateAction} from "react"

export interface AIAgentWelcomeRef {
    /** 外接触发使用 forge 模板的功能 */
    onTriggerExecForge: (id: number) => void
}

export interface AIAgentWelcomeProps {
    onTriageSubmit: (question: string) => void
}

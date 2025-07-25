import {AIForge} from "@/pages/ai-agent/type/aiChat"
import {Dispatch, SetStateAction} from "react"

export interface ForgeEditorProps {
    isModify?: boolean
}

export interface EditorAIForge extends AIForge {
    Id?: number
}

export interface ConfigTypeForgePromptAction {
    Action?: AIForge["Action"]
    InitPrompt?: AIForge["InitPrompt"]
    PersistentPrompt?: AIForge["PersistentPrompt"]
    PlanPrompt?: AIForge["PlanPrompt"]
    ResultPrompt?: AIForge["ResultPrompt"]
}

export interface AIForgeEditorPreviewParamsProps {
    content: string
    triggerParse?: boolean
}

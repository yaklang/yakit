import {AIForge} from "@/pages/ai-agent/type/forge"
import {Dispatch, ForwardedRef, SetStateAction} from "react"

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

export interface AIForgeEditorInfoFormRef {
    setFormValues: (values: any) => any
    resetFormValues: () => void
    getFormValues: () => Promise<EditorAIForge | null>
}
export interface AIForgeEditorInfoFormProps {
    ref?: ForwardedRef<AIForgeEditorInfoFormRef>
    setType: Dispatch<SetStateAction<AIForge["ForgeType"]>>
    setContent: (content: string) => void
}

export interface PromptAndActiveTextareaProps {
    title: string
    hint?: string
    value: string
    onChange: (value: string) => void
    placeholder?: string
}

export interface AIForgeEditorPromptAndActionProps {
    promptAction: ConfigTypeForgePromptAction
    setPromptAction: Dispatch<SetStateAction<ConfigTypeForgePromptAction>>
}

export interface AIForgeEditorCodeAndParamsProps {
    content: string
    setContent: (value: string) => void
    triggerParse?: boolean
    className?: string
}

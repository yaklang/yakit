import {SaveAIToolRequest} from "@/pages/ai-agent/type/aiTool"

export interface AIToolEditorProps {
    pageId: string
    isModify?: boolean
    mountContainer?: HTMLElement | null
}
export interface AIToolEditorInfoFormRef {
    setFormValues: (values: SaveAIToolRequest) => void
    getFormValues: () => Promise<EditorAIForge | null>
}
export interface AIToolEditorInfoFormProps {
    ref?: ForwardedRef<AIToolEditorInfoFormRef>
    content: string
    mountContainer?: HTMLElement | null
}

export type EditorAIToolTab = "code" | "execResult"

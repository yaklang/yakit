import {SaveAIToolRequest} from "@/pages/ai-agent/type/aiTool"

export interface AIToolEditorProps {
    pageId: string
    isModify?: boolean
}
export interface AIToolEditorInfoFormRef {
    setFormValues: (values: SaveAIToolRequest) => void
    getFormValues: () => Promise<EditorAIForge | null>
}
export interface AIToolEditorInfoFormProps {
    ref?: ForwardedRef<AIToolEditorInfoFormRef>
    content: string
}

export type EditorAIToolTab = "code" | "execResult"

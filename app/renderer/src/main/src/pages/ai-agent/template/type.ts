import {ReactNode} from "react"
import {TextAreaProps} from "antd/lib/input"
import {AIMentionCommandParams} from "../components/aiMilkdownInput/aiMilkdownMention/aiMentionPlugin"
import {EditorMilkdownProps} from "@/components/MilkdownEditor/MilkdownEditorType"
import {AIReActChatProps} from "@/pages/ai-re-act/aiReActChat/AIReActChatType"

export interface QSInputTextareaProps extends Omit<TextAreaProps, "bordered" | "autoSize"> {}

export interface AIChatTextareaSubmit {
    /**传给后端的内容 */
    qs: string
    /**前端展示的md格式 */
    showQS?: string
    mentionList?: AIMentionCommandParams[]
    focusMode?: string
}
export interface AIChatTextareaRefProps {
    setMention: (v: AIMentionCommandParams) => void
    setValue: (v: string) => void
    getValue: () => void
    editorMilkdown?: EditorMilkdownProps
}

export type DefaultAIFocusMode = NonNullable<AIReActChatProps["externalParameters"]>["defaultAIFocusMode"]
export interface AIChatTextareaProps {
    ref?: React.ForwardedRef<AIChatTextareaRefProps>
    /** 提交按钮的 loading 状态 */
    loading?: boolean
    extraFooterLeft?: ReactNode
    extraFooterRight?: ReactNode
    onSubmit?: (v: AIChatTextareaSubmit) => void
    className?: string
    children?: ReactNode
    defaultValue?: string
    defaultAIFocusMode?: DefaultAIFocusMode
}
export interface FileToChatQuestionList {
    path: string
    isFolder: boolean
}

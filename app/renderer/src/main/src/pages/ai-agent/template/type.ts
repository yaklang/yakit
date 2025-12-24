import {Dispatch, ReactNode, SetStateAction} from "react"
import {TextAreaProps} from "antd/lib/input"
import {AIChatMentionSelectItem} from "../components/aiChatMention/type"
import {FileToChatQuestionList} from "@/pages/ai-re-act/aiReActChat/store"

export interface QSInputTextareaProps extends Omit<TextAreaProps, "bordered" | "autoSize"> {}

export interface AIChatTextareaSubmit {
    qs: string
    selectForges?: AIChatMentionSelectItem[]
    selectTools?: AIChatMentionSelectItem[]
    selectKnowledgeBases?: AIChatMentionSelectItem[]
    fileToQuestion?: FileToChatQuestionList[]
}
export interface AIChatTextareaProps {
    /** 提交按钮的 loading 状态 */
    loading?: boolean
    question?: string
    setQuestion?: Dispatch<SetStateAction<string>>
    extraFooterLeft?: ReactNode
    extraFooterRight?: ReactNode
    onSubmit?: (v: AIChatTextareaSubmit) => void
    textareaProps?: Omit<QSInputTextareaProps, "value">
    className?: string
    children?: ReactNode
}
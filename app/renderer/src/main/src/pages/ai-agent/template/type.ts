import {Dispatch, ReactNode, SetStateAction} from "react"
import {TextAreaProps} from "antd/lib/input"
import {AIChatMentionSelectItem} from "../components/aiChatMention/type"
import {AIMentionCommandParams} from "../components/aiMilkdownInput/aiMilkdownMention/aiMentionPlugin"

export interface QSInputTextareaProps extends Omit<TextAreaProps, "bordered" | "autoSize"> {}

export interface AIChatTextareaSubmit {
    qs: string
    selectForges?: AIChatMentionSelectItem[]
    selectTools?: AIChatMentionSelectItem[]
    selectKnowledgeBases?: AIChatMentionSelectItem[]
    fileToQuestion?: FileToChatQuestionList[]
}
export interface AIChatTextareaRefProps {
    setMention: (v: AIMentionCommandParams) => void
}
export interface AIChatTextareaProps {
    ref?: React.ForwardedRef<AIChatTextareaRefProps>
    /** 提交按钮的 loading 状态 */
    loading?: boolean
    question?: string
    setQuestion?: Dispatch<SetStateAction<string>>
    extraFooterLeft?: ReactNode
    extraFooterRight?: ReactNode
    onSubmit?: (v: AIChatTextareaSubmit) => void
    className?: string
    children?: ReactNode
}
export interface FileToChatQuestionList {
    path: string
    isFolder: boolean
}
import {ReactNode} from "react"
import {TextAreaProps} from "antd/lib/input"
import {AIMentionCommandParams} from "../components/aiMilkdownInput/aiMilkdownMention/aiMentionPlugin"
import {AIChatIPCStartParams} from "@/pages/ai-re-act/hooks/type"

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
    // TODO 临时添加，下周处理
    onMemfitExtra?: (v) => void
    getValue: () => void
}
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
}
export interface FileToChatQuestionList {
    path: string
    isFolder: boolean
}

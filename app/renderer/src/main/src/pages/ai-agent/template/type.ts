import {ReactNode} from "react"
import {TextAreaProps} from "antd/lib/input"
import {AIMentionCommandParams} from "../components/aiMilkdownInput/aiMilkdownMention/aiMentionPlugin"
import {EditorMilkdownProps} from "@/components/MilkdownEditor/MilkdownEditorType"
import {AIReActChatProps} from "@/pages/ai-re-act/aiReActChat/AIReActChatType"
import {AIChatMentionProps} from "../components/aiChatMention/type"
import {AIReviewRuleSelectProps} from "@/pages/ai-re-act/aiReviewRuleSelect/type"
import {AIModelSelectProps} from "../aiModelList/aiModelSelect/AIModelSelectType"
import {AIFocusModeProps} from "@/pages/ai-re-act/aiFocusMode/type"

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
export enum AIInputInnerFeatureEnum {
    AIReviewRuleSelect = "AIReviewRuleSelect",
    AIModelSelect = "AIModelSelect",
    AIFocusMode = "AIFocusMode"
}
export type AIInputInnerFeature = `${AIInputInnerFeatureEnum}`
interface FooterLeftTypesBase<T extends string, U> {
    type: T
    props?: U
    component?: ReactNode
}
type AIReviewRuleSelectType = FooterLeftTypesBase<AIInputInnerFeatureEnum.AIReviewRuleSelect, AIReviewRuleSelectProps>
type AIModelSelectType = FooterLeftTypesBase<AIInputInnerFeatureEnum.AIModelSelect, AIModelSelectProps>
type AIFocusModeType = FooterLeftTypesBase<AIInputInnerFeatureEnum.AIFocusMode, AIFocusModeProps>
export type FooterLeftTypesComponentProps = AIReviewRuleSelectType | AIModelSelectType | AIFocusModeType
export interface AIChatTextareaProps {
    ref?: React.ForwardedRef<AIChatTextareaRefProps>
    /** 提交按钮的 loading 状态 */
    loading?: boolean
    /**输入框左下角 */
    inputFooterLeft?: ReactNode
    /**输入框右下角 */
    inputFooterRight?: ReactNode
    /**底部 */
    footer?: ReactNode
    onSubmit?: (v: AIChatTextareaSubmit) => void
    className?: string
    children?: ReactNode
    defaultValue?: string
    /**ai模型不存在时，是否弹窗 */
    isOpen?: boolean
    filterMentionType?: AIChatMentionProps["filterMode"]
    footerLeftTypes?: (AIInputInnerFeature | FooterLeftTypesComponentProps)[]
}

export interface FileToChatQuestionList {
    path: string
    isFolder: boolean
}

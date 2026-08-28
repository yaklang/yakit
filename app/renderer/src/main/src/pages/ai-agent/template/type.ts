import type { ReactNode } from 'react'
import type { TextAreaProps } from 'antd/lib/input'
import type { AIMentionCommandParams } from '../components/aiMilkdownInput/aiMilkdownMention/aiMentionPlugin'
import type {
  AIHttpFlowCommandParams,
  AIHttpFlowRemovePayload,
} from '../components/aiMilkdownInput/aiMilkdownHttpFlow/aiHttpFlowPlugin'
import type { AICodeBlockCommandParams } from '../components/aiMilkdownInput/aiCodeBlock/aiCustomCodeBlockPlugin'
import type { EditorMilkdownProps } from '@/components/MilkdownEditor/MilkdownEditorType'
import type { AIChatMentionProps } from '../components/aiChatMention/type'
import type { AIReviewRuleSelectProps } from '@/pages/ai-re-act/aiReviewRuleSelect/type'
import type { AIModelSelectProps } from '../aiModelList/aiModelSelect/AIModelSelectType'
import type { AIFocusModeProps } from '@/pages/ai-re-act/aiFocusMode/type'
import type { AIReasoningEffortSelectProps } from '@/pages/ai-re-act/aiReasoningEffortSelect/type'
import type { AIEnabledCapability } from '@/pages/ai-re-act/hooks/grpcApi'

export interface QSInputTextareaProps extends Omit<TextAreaProps, 'bordered' | 'autoSize'> {}

export interface AIChatTextareaSubmit {
  /**传给后端的内容 */
  qs: string
  /**前端展示的md格式 */
  showQS?: string
  mentionList?: AIMentionCommandParams[]
  /**图片 */
  imageList?: string[]
  /** history 勾选的流量 */
  httpFlowList?: AIHttpFlowCommandParams[]
  /** 编辑器选中的代码块 */
  codeBlockList?: AICodeBlockCommandParams[]
  focusMode?: string
  /** 新建会话得 默认sessionId */
  sessionId?: string
  /** 新建会话时显式预加载的能力，推荐 Skill 使用 Type=skill。 */
  enabledCapabilities?: AIEnabledCapability[]
}
export interface AIChatTextareaRefProps {
  setMention: (v: AIMentionCommandParams) => void
  setValue: (v: string) => void
  setHttpFlow: (ids: string[]) => void
  getValue: () => void
  editorMilkdown?: EditorMilkdownProps
}
export enum AIInputInnerFeatureEnum {
  AIReviewRuleSelect = 'AIReviewRuleSelect',
  AIModelSelect = 'AIModelSelect',
  AIReasoningEffortSelect = 'AIReasoningEffortSelect',
}
export enum AIInputFooterRightEnum {
  AIFocusMode = 'AIFocusMode',
}
export type AIInputInnerFeature = `${AIInputInnerFeatureEnum}`
export type AIInputFooterRight = `${AIInputFooterRightEnum}`
interface FooterLeftTypesBase<T extends string, U> {
  type: T
  props?: U
  component?: ReactNode
}
type AIReviewRuleSelectType = FooterLeftTypesBase<AIInputInnerFeatureEnum.AIReviewRuleSelect, AIReviewRuleSelectProps>
type AIModelSelectType = FooterLeftTypesBase<AIInputInnerFeatureEnum.AIModelSelect, AIModelSelectProps>
type AIReasoningEffortSelectType = FooterLeftTypesBase<
  AIInputInnerFeatureEnum.AIReasoningEffortSelect,
  AIReasoningEffortSelectProps
>
type AIFocusModeType = FooterLeftTypesBase<'AIFocusMode', AIFocusModeProps>
export type FooterLeftTypesComponentProps = AIReviewRuleSelectType | AIModelSelectType | AIReasoningEffortSelectType
export type FooterRightTypesComponentProps = AIFocusModeType
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
  filterMentionType?: AIChatMentionProps['filterMode']
  footerLeftTypes?: (AIInputInnerFeature | FooterLeftTypesComponentProps)[]
  footerRightTypes?: (AIInputFooterRight | FooterRightTypesComponentProps)[]
  /** 图片路径前缀 */
  chatDataStoreKey: string
  onHttpFlowRemove?: (payload: AIHttpFlowRemovePayload) => void
}

export interface FileToChatQuestionList {
  path: string
  isFolder: boolean
}

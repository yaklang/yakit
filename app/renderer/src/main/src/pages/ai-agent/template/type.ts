import type { ReactNode } from 'react'
import type { TextAreaProps } from 'antd/lib/input'
import type { AIMentionCommandParams } from '../components/aiMilkdownInput/aiMilkdownMention/aiMentionPlugin'
import type { AIResourceReferenceParams } from '../components/aiMilkdownInput/aiMilkdownResourceReference/aiResourceReferencePlugin'
import type { AICodeBlockCommandParams } from '../components/aiMilkdownInput/aiCodeBlock/aiCustomCodeBlockPlugin'
import type { EditorMilkdownProps } from '@/components/MilkdownEditor/MilkdownEditorType'
import type { AIChatMentionProps } from '../components/aiChatMention/type'
import type { AIReviewRuleSelectProps } from '@/pages/ai-re-act/aiReviewRuleSelect/type'
import type { AIFocusModeProps } from '@/pages/ai-re-act/aiFocusMode/type'
import type { AIEnabledCapability } from '@/pages/ai-re-act/hooks/grpcApi'
import type { AIModelSelectProps } from '../aiModelList/aiModelSelect/AIModelSelectType'

export interface QSInputTextareaProps extends Omit<TextAreaProps, 'bordered' | 'autoSize'> {}

export type AIResourceIds = Record<AIResourceReferenceParams['type'], string[]>

export interface AIChatDraftMaterials {
  /** 正文引用的资源 ID，按资源类型分组 */
  resourceIds: AIResourceIds
  /** 从编辑器提取的正文提及和图片附件 */
  mentions: AIMentionCommandParams[]
  /** 通过资料面板添加、未插入正文的资料 */
  selectedMaterials: AIMentionCommandParams[]
  /** 在资料栏隐藏的正文提及键，对应的编辑器节点仍保留 */
  hiddenInlineKeys: string[]
}

export interface AIChatTextareaSubmit {
  /**传给后端的内容 */
  qs: string
  /**前端展示的md格式 */
  showQS?: string
  mentionList?: AIMentionCommandParams[]
  /**图片 */
  imageList?: string[]
  /** 表格勾选和正文中的资源引用 */
  resourceReferences?: AIResourceReferenceParams[]
  /** 兼容旧版提交数据 */
  httpFlowList?: { flowIds?: string | string[]; flowId?: string; displayText?: string; isSummary?: boolean }[]
  riskList?: { riskIds: string[]; displayText?: string; isSummary?: boolean }[]
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
  getValue: () => void
  editorMilkdown?: EditorMilkdownProps
}
export enum AIInputInnerFeatureEnum {
  AIReviewRuleSelect = 'AIReviewRuleSelect',
}
export enum AIInputFooterRightEnum {
  AIFocusMode = 'AIFocusMode',
  AIModelSelect = 'AIModelSelect',
}
export type AIInputInnerFeature = `${AIInputInnerFeatureEnum}`
export type AIInputFooterRight = `${AIInputFooterRightEnum}`
interface FooterLeftTypesBase<T extends string, U> {
  type: T
  props?: U
  component?: ReactNode
}
type AIReviewRuleSelectType = FooterLeftTypesBase<AIInputInnerFeatureEnum.AIReviewRuleSelect, AIReviewRuleSelectProps>
type AIModelSelectType = FooterLeftTypesBase<AIInputFooterRightEnum.AIModelSelect, AIModelSelectProps>
type AIFocusModeType = FooterLeftTypesBase<AIInputFooterRightEnum.AIFocusMode, AIFocusModeProps>
export type FooterLeftTypesComponentProps = AIReviewRuleSelectType
export type FooterRightTypesComponentProps = AIFocusModeType | AIModelSelectType
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
  /** Milkdown 编辑器外层样式。 */
  milkdownClassName?: string
  children?: ReactNode
  defaultValue?: string
  /**ai模型不存在时，是否弹窗 */
  isOpen?: boolean
  filterMentionType?: AIChatMentionProps['filterMode']
  footerLeftTypes?: (AIInputInnerFeature | FooterLeftTypesComponentProps)[]
  footerRightTypes?: (AIInputFooterRight | FooterRightTypesComponentProps)[]
  /** 图片路径前缀 */
  chatDataStoreKey: string
  /** 欢迎页在首次连接前展示的场景能力 */
  showScenarioCapabilities?: boolean
  selectedHttpFlowIds?: string[]
  selectedRiskIds?: string[]
  onHttpFlowRemove?: (id: string, isSummary: boolean) => void
}

export const MAX_ATTACHMENTS_PER_BATCH = 10

export interface FileToChatQuestionList {
  path: string
  isFolder: boolean
  mentionSource?: 'attachment'
}

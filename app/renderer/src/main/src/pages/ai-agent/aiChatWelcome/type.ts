import type { YakitButtonProp } from '@/components/yakitUI/YakitButton/YakitButton'
import type { HandleStartParams } from '../aiAgentChat/type'
import type { AIReActChatRefProps } from '@/pages/ai-re-act/aiReActChat/AIReActChatType'
import type { AIMentionCommandParams } from '../components/aiMilkdownInput/aiMilkdownMention/aiMentionPlugin'
import type { AIEnabledCapability } from '@/pages/ai-re-act/hooks/grpcApi'

export interface AIChatWelcomeProps {
  onTriageSubmit: (data: HandleStartParams) => void
  onSetReAct: () => void
  ref?: React.ForwardedRef<AIReActChatRefProps>
}
export interface AIRecommendItem {
  type: string
  name: string
  description: string
}

export interface AIMaterialsData {
  type: string
  mentionType: AIMentionCommandParams['mentionType']
  data: AIRecommendItem[]
}
export interface RandomAIMaterialsDataProps {
  tools: AIMaterialsData
  forges: AIMaterialsData
  knowledgeBases: AIMaterialsData
}

export interface SideSettingButtonProps extends YakitButtonProp {}

export interface AIChatWelcomeIntroTipsProps {
  onSetInputValue: (v: string) => void
  /** 页面较小时只展示 3 条建议 */
  compact?: boolean
}

export type DragSource = 'desktopToAItree' | 'AIRreeToChat' | null
export interface AIChatWelcomeSettingCardProps {}
export interface AIChatWelcomeSettingCardRef {
  /** 获取当前选中的推荐场景（支持多选） */
  getSelect: () => AIEnabledCapability[]
}

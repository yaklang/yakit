import type { YakitButtonProp } from '@/components/yakitUI/YakitButton/YakitButton'
import type { AIChatSubmitParams } from '../aiAgentChat/type'
import type { AIReActChatRefProps } from '@/pages/ai-re-act/aiReActChat/AIReActChatType'
import type { AIMentionCommandParams } from '../components/aiMilkdownInput/aiMilkdownMention/aiMentionPlugin'

export interface AIChatWelcomeProps {
  onTriageSubmit: (data: AIChatSubmitParams) => boolean
  onSetReAct: () => void
  selectedHttpFlowIds?: string[]
  selectedRiskIds?: string[]
  onHttpFlowRemove?: (id: string, isSummary: boolean) => void
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

export type DragSource = 'desktopToAItree' | 'AIRreeToChat' | null

import {YakitButtonProp} from "@/components/yakitUI/YakitButton/YakitButton"
import type {HandleStartParams} from "../aiAgentChat/type"
import useMultipleHoldGRPCStream from "@/pages/KnowledgeBase/hooks/useMultipleHoldGRPCStream"
import {AIReActChatRefProps} from "@/pages/ai-re-act/aiReActChat/AIReActChatType"
import {AIMentionCommandParams} from "../components/aiMilkdownInput/aiMilkdownMention/aiMentionPlugin"

export interface AIChatWelcomeProps {
    onTriageSubmit: (data: HandleStartParams) => void
    onSetReAct: () => void
    api?: ReturnType<typeof useMultipleHoldGRPCStream>[1]
    streams?: ReturnType<typeof useMultipleHoldGRPCStream>[0]
    ref?: React.ForwardedRef<AIReActChatRefProps>
}
export interface AIRecommendItem {
    type: string
    name: string
    description: string
}
export interface AIRecommendProps extends Omit<AIRecommendItemProps, "item"> {
    title: string
    data: AIRecommendItem[]
    onMore: () => void
}

export interface AIRecommendItemProps {
    item: AIRecommendItem
    lineStartDOMRect?: DOMRect
    onCheckItem: (item: AIRecommendItem) => void
}

export interface AIMaterialsData {
    type: string
    mentionType: AIMentionCommandParams["mentionType"]
    data: AIRecommendItem[]
}
export interface RandomAIMaterialsDataProps {
    tools: AIMaterialsData
    forges: AIMaterialsData
    knowledgeBases: AIMaterialsData
}

export interface SideSettingButtonProps extends YakitButtonProp {}

export type DragSource = "desktopToAItree" | "AIRreeToChat" | null

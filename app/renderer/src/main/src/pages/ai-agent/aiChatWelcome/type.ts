import {YakitButtonProp} from "@/components/yakitUI/YakitButton/YakitButton"
import {ReactNode} from "react"

export interface AIChatWelcomeProps {
    onTriageSubmit: (question: string) => void
    onSetReAct: () => void
}
interface AIRecommendItem {
    type: string
    name: string
    description: string
}
export interface AIRecommendProps extends Omit<AIRecommendItemProps, "item"> {
    icon: ReactNode
    hoverIcon: ReactNode
    title: ReactNode
    data: AIRecommendItem[]
    onMore: () => void
}

export interface AIRecommendItemProps {
    item: AIRecommendItem
    lineStartDOMRect?: DOMRect
    checkItems: AIRecommendItem[]
    onCheckItem: (item: AIRecommendItem) => void
}

export interface AIMaterialsData {
    type: string
    data: AIRecommendItem[]
    icon: ReactNode
    hoverIcon: ReactNode
}
export interface RandomAIMaterialsDataProps {
    tools: AIMaterialsData
    forges: AIMaterialsData
    knowledgeBases: AIMaterialsData
}

export interface SideSettingButtonProps extends YakitButtonProp {}

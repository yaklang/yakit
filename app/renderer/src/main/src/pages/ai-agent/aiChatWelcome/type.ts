import {ReactNode} from "react"

export interface AIChatWelcomeProps {
    onTriageSubmit: (question: string) => void
}
export interface AIRecommendProps extends Omit<AIRecommendItemProps, "item"> {
    icon: ReactNode
    hoverIcon: ReactNode
    title: ReactNode
    data: AIRecommendItemProps["item"][]
    onMore: () => void
}

export interface AIRecommendItemProps {
    item: {
        name: string
        description: string
    }
    lineStartDOMRect?: DOMRect
    checkItems: AIRecommendItemProps["item"][]
    onCheckItem: (item: AIRecommendItemProps["item"]) => void
}

export interface RandomAIMaterialsDataProps {
    tools: {
        type: string
        data: AIRecommendItemProps["item"][]
        icon: ReactNode
        hoverIcon: ReactNode
    }
    forges: {
        type: string
        data: AIRecommendItemProps["item"][]
        icon: ReactNode
        hoverIcon: ReactNode
    }
    knowledgeBases: {
        type: string
        data: AIRecommendItemProps["item"][]
        icon: ReactNode
        hoverIcon: ReactNode
    }
}

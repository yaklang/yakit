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
    item: string
    lineStartDOMRect?: DOMRect
    checkItems: string[]
    onCheckItem: (item: string) => void
}

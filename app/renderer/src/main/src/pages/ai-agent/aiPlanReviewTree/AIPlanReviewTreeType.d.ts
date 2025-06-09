import {AIChatMessage} from "../type/aiChat"

export interface AIPlanReviewTreeProps {
    list: AIChatMessage.PlanTask[]
    /**是否可以编辑 */
    editable?: boolean
}

export interface AIPlanReviewTreeItemProps {
    order: number
    item: AIChatMessage.PlanTask
    preIndex: string
    nextIndex: string
    /**是否可以编辑 */
    editable?: boolean
    /**增加该节点得子节点 */
    onAddSubNode: (item: AIChatMessage.PlanTask) => void
    /**增加该节点得兄弟节点 */
    onAddBrotherNode: (item: AIChatMessage.PlanTask) => void
}

export interface ContentEditableDivProps {
    className?: string
    value: string
    setValue: (s: string) => void
    /**是否可以编辑 */
    editable?: boolean
}

export interface AIPlanReviewTreeArrowLineProps {
    preIndex: string
    nextIndex: string
}

export interface AIPlanReviewTreeLineProps {
    order: number
    item: AIChatMessage.PlanTask
    preIndex: string
    nextIndex: string
    expand: boolean
    onSetExpand: () => void
}

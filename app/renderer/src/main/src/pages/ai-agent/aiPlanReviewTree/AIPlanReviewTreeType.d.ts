import {AIChatMessage} from "../type/aiChat"

export interface AIPlanReviewTreeProps {
    defaultList: AIChatMessage.PlanTask[]
    list: AIChatMessage.PlanTask[]
    setList: (v: AIChatMessage.PlanTask[]) => void
    /**是否可以编辑 */
    editable?: boolean
    planReviewTreeKeywordsMap: Map<string, AIChatMessage.PlanReviewRequireExtra>
    currentPlansId:string
}

export type PlanTaskType = keyof AIChatMessage.PlanTask
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
    /**删除节点 */
    onRemoveNode: (item: AIChatMessage.PlanTask) => void
    /**修改当前编辑的值 */
    setItem: (item: AIChatMessage.PlanTask, option: SetItemOption) => void
    /**通过index获取关键词和解释 */
    planReviewTreeKeywordsMap: Map<string, AIChatMessage.PlanReviewRequireExtra>
    currentPlansId:string
}

export interface SetItemOption {
    label: PlanTaskType
    value: string | string[]
}

export interface ContentEditableDivProps {
    className?: string
    value: string
    setValue: (s: string) => void
    /**是否可以编辑 */
    editable?: boolean
    placeholder?:string
}

export interface AIPlanReviewTreeArrowLineProps {}

export interface AIPlanReviewTreeLineProps {
    order: number
    item: AIChatMessage.PlanTask
    preIndex: string
    nextIndex: string
    expand: boolean
    onSetExpand: () => void
}

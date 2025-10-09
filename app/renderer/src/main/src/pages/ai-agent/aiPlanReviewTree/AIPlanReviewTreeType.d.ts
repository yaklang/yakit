import {AIAgentGrpcApi} from "@/pages/ai-re-act/hooks/grpcApi"

export interface AIPlanReviewTreeProps {
    defaultList: AIAgentGrpcApi.PlanTask[]
    list: AIAgentGrpcApi.PlanTask[]
    setList: (v: AIAgentGrpcApi.PlanTask[]) => void
    /**是否可以编辑 */
    editable?: boolean
    planReviewTreeKeywordsMap: Map<string, AIAgentGrpcApi.PlanReviewRequireExtra>
    currentPlansId: string
}

export type PlanTaskType = keyof AIAgentGrpcApi.PlanTask
export interface AIPlanReviewTreeItemProps {
    order: number
    item: AIAgentGrpcApi.PlanTask
    preIndex: string
    nextIndex: string
    /**是否可以编辑 */
    editable?: boolean
    /**增加该节点得子节点 */
    onAddSubNode: (item: AIAgentGrpcApi.PlanTask) => void
    /**增加该节点得兄弟节点 */
    onAddBrotherNode: (item: AIAgentGrpcApi.PlanTask) => void
    /**删除节点 */
    onRemoveNode: (item: AIAgentGrpcApi.PlanTask) => void
    /**修改当前编辑的值 */
    setItem: (item: AIAgentGrpcApi.PlanTask, option: SetItemOption) => void
    /**通过index获取关键词和解释 */
    planReviewTreeKeywordsMap: Map<string, AIAgentGrpcApi.PlanReviewRequireExtra>
    currentPlansId: string
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
    placeholder?: string
}

export interface AIPlanReviewTreeArrowLineProps {}

export interface AIPlanReviewTreeLineProps {
    order: number
    item: AIAgentGrpcApi.PlanTask
    preIndex: string
    nextIndex: string
    expand: boolean
    onSetExpand: () => void
}

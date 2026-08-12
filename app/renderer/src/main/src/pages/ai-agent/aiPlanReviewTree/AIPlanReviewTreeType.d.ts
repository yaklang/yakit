import { type AIAgentGrpcApi } from '@/pages/ai-re-act/hooks/grpcApi'
import { type AITaskInfoProps } from '@/pages/ai-re-act/hooks/aiRender'

export interface AIPlanReviewTreeProps {
  defaultList: AITaskInfoProps[]
  list: AITaskInfoProps[]
  setList: (v: AITaskInfoProps[]) => void
  /**是否可以编辑 */
  editable?: boolean
  planReviewTreeKeywordsMap: Map<string, AIAgentGrpcApi.PlanReviewRequireExtra>
  currentPlansId: string
}

export type PlanTaskType = keyof AIAgentGrpcApi.PlanTask
export interface AIPlanReviewTreeItemProps {
  order: number
  item: AITaskInfoProps
  preLevel: number
  nextLevel: number
  /**是否可以编辑 */
  editable?: boolean
  /**增加该节点得子节点 */
  onAddSubNode: (item: AITaskInfoProps) => void
  /**增加该节点得兄弟节点 */
  onAddBrotherNode: (item: AITaskInfoProps) => void
  /**删除节点 */
  onRemoveNode: (item: AITaskInfoProps) => void
  /**修改当前编辑的值 */
  setItem: (item: AITaskInfoProps, option: SetItemOption) => void
  /**通过 task_id 获取关键词和解释 */
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
  item: AITaskInfoProps
  preLevel: number
  nextLevel: number
  expand: boolean
  onSetExpand: () => void
}

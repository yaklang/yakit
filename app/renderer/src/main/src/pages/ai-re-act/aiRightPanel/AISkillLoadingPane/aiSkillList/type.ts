import type { AISkillLoadState } from '../type'

export type AISkillListSource = 'task-details' | 'right-panel'

export interface AISkillListItem {
  name: string
  description: string
  skill_load_state?: AISkillLoadState | ''
  token_count?: number
}

export interface AISkillListProps {
  source: AISkillListSource
  data: AISkillListItem[]
  loadState: AISkillLoadState
  onAdd?: (name: string) => void
  addLoading?: boolean
  addingSkill?: string
  onEndReached?: () => void
  refreshLoading?: boolean
  loadingMore?: boolean
  hasMore?: boolean
}

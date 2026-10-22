import type { AISkillLoadState } from '../type'

export interface AISkillListItem {
  name: string
  description: string
  skill_load_state?: AISkillLoadState | ''
  token_count?: number
}

export interface AISkillInventory {
  fixed: AISkillListItem[]
  dynamic: AISkillListItem[]
}

export interface AISkillListProps {
  data: AISkillListItem[]
  loadState: AISkillLoadState
  onAdd: (name: string) => void
  addLoading: boolean
  addingSkill: string
}

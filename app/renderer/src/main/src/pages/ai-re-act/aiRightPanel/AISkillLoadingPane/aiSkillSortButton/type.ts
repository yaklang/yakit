import type { AISkillSortOrder } from '../type'

export interface AISkillSortButtonProps {
  sortOrder: AISkillSortOrder
  onChange: (value: AISkillSortOrder) => void
}

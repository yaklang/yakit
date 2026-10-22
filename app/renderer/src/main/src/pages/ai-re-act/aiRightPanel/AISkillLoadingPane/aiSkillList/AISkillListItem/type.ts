import type { AISkillListItem, AISkillListProps } from '../type'

export interface AISkillListItemProps extends Omit<AISkillListProps, 'data'> {
  skill: AISkillListItem
}

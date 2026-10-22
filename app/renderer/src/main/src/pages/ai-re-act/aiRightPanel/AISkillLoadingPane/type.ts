import type { MouseEvent } from 'react'
import type { CustomIconComponentProps } from '@ant-design/icons/lib/components/Icon'
import type { AISkillInventory } from './aiSkillList/type'

export type AISkillLoadState = 'loaded' | 'metadata'
export type AISkillSortOrder = 'asc' | 'desc' | undefined

export interface GetSkillListParams {
  skills: AISkillInventory | undefined
  loadState: AISkillLoadState
  keyword?: string
  sortOrder?: AISkillSortOrder
}

export interface AISkillLoadingPaneProps {
  loadState: AISkillLoadState
  onTotalChange?: (total: number) => void
}

export interface IconProps extends CustomIconComponentProps {
  onClick: (e: MouseEvent) => void
}

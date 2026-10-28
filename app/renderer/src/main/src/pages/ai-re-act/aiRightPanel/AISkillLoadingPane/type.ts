import type { MouseEvent } from 'react'
import type { CustomIconComponentProps } from '@ant-design/icons/lib/components/Icon'
import type { AISkillListItem } from './aiSkillList/type'
import type { AISkillLoadStateEnum } from '../../hooks/grpcApi'

export type AISkillLoadState = `${AISkillLoadStateEnum}`
export type AISkillSortOrder = 'asc' | 'desc' | undefined

export interface GetSkillListParams {
  skills: AISkillListItem[]
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

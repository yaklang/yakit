import type { ReactNode } from 'react'
import type { ResourceFilterValue } from '../../../resourceFilter'
import type { MaterialPanelHeader } from '../type'

export interface MaterialListPanelProps extends MaterialPanelHeader {
  search?: string
  onSearchChange?: (value: string) => void
  filter?: {
    value: ResourceFilterValue
    onChange: (value: ResourceFilterValue) => void
  }
  variant?: 'scenario' | 'attachments'
  headerAction?: ReactNode
  children: ReactNode
}

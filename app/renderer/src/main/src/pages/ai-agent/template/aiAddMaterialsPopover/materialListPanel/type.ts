import type { ReactNode } from 'react'
import type { MaterialPanelHeader } from '../type'

export interface MaterialListPanelProps extends MaterialPanelHeader {
  search: string
  onSearchChange: (value: string) => void
  filter?: {
    addedOnly: boolean
    onChange: (addedOnly: boolean) => void
  }
  variant?: 'scenario' | 'attachments'
  headerAction?: ReactNode
  children: ReactNode
}

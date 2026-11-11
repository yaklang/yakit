import type { ReactNode } from 'react'

export interface MaterialSummaryRow {
  key: string
  name: string
  icon: ReactNode
  description?: string
  skillName?: string
  count?: number
  hideCount?: boolean
  onOpen?: () => void
  onRemove?: () => void
  selection?: { checked: boolean; onChange: () => void }
  onEdit?: () => void
}

export interface MaterialSummaryGroup {
  key: string
  label: string
  title: string
  count: number
  icon?: ReactNode
  rows: MaterialSummaryRow[]
  onAdd?: () => void
}

export interface MaterialSummaryPanelProps {
  group: MaterialSummaryGroup
  onClose: () => void
}

export interface MaterialSummaryProps {
  groups: MaterialSummaryGroup[]
  onOpen: () => void
}

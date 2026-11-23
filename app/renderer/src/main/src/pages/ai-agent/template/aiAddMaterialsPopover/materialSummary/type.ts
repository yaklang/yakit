import type { ReactNode } from 'react'

export interface MaterialSummaryRow {
  onClearCategory?: () => void
  group?: MaterialSummaryGroup
  key: string
  name: string
  icon: ReactNode
  description?: string
  count?: number
  hideCount?: boolean
  onOpen?: () => void
  onRemove?: () => void
  selection?: { checked: boolean; onChange: () => void }
  onEdit?: () => void
}

export interface MaterialSummaryGroup {
  allowCategoryRemoval?: boolean
  key: string
  label: string
  title: string
  count: number
  icon?: ReactNode
  rows: MaterialSummaryRow[]
  onRemove?: () => void
  onAdd?: () => void
  headerAction?: ReactNode
}

export interface MaterialSummaryPanelProps {
  group: MaterialSummaryGroup
  onClose: () => void
}

export interface MaterialSummaryProps {
  groups: MaterialSummaryGroup[]
  onOpen: () => void
}

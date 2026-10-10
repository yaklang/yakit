import type { AIReActSchedule } from '@/pages/ai-re-act/hooks/grpcApi'

export interface AIScheduledTasksListItemProps {
  item: AIReActSchedule
  onSetData: (value: AIReActSchedule) => void
  onRefresh: () => void
  onEdit: (value: AIReActSchedule) => void
  onRunNow?: (value: AIReActSchedule) => void
}

export interface AIScheduledTasksListProps extends Omit<AIScheduledTasksListItemProps, 'item'> {
  data: AIReActSchedule[]
  loading: boolean
  filtered: boolean
  onClearFilter: () => void
  onAdd: () => void
}

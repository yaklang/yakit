import type { AIReActSchedule } from '../../ai-re-act/hooks/grpcApi'

export interface AIScheduledTasksProps {}
export type ScheduleQueryType = 'all' | 'active' | 'paused' | 'completed'

export interface AIScheduledTasksListItemProps {
  item: AIReActSchedule
  onSetData: (value: AIReActSchedule) => void
  onRefresh: () => void
  onEdit: (value: AIReActSchedule) => void
  onOpenDetail?: (value: AIReActSchedule) => void
  onRunNow?: (value: AIReActSchedule) => void
}

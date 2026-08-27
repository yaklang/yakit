import type { AIReActSchedule } from '@/pages/ai-re-act/hooks/grpcApi'

export interface AIScheduledTasksDetailProps {
  uuid: string
  initialSchedule: AIReActSchedule
  onClose: () => void
  onDataChange?: (schedule: AIReActSchedule) => void
  onEdit?: (schedule: AIReActSchedule) => void
  onRunNow?: (schedule: AIReActSchedule) => void
  onDeleteAfter?: (schedule: AIReActSchedule) => void
}

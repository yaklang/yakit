import type { AIGoalTimePatch } from '@/pages/ai-re-act/hooks/grpcApi'

export interface GoalTimeAdjustmentsProps {
  loading: boolean
  expired: boolean
  onAdjust: (patch: AIGoalTimePatch) => void
}

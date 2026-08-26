import type { AIReActSchedule } from '@/pages/ai-re-act/hooks/grpcApi'
import type { Moment } from 'moment'
import type { AISession } from '../../type/aiChat'

export type FrequencyPreset = 'once' | 'minutes' | 'hourly' | 'daily' | 'weekdays' | 'weekly'
export type ScheduleTargetMode = 'new_session_per_run' //|'continue_session'

export interface ScheduleFormValues {
  Name: string
  Prompt: string
  Frequency: FrequencyPreset
  IntervalMinutes: number
  StartAt: Moment
  TargetMode: ScheduleTargetMode
  TargetSessionID?: string
}

export interface ScheduledTasksFormProps {
  /** 编辑时的原任务；不传为新建 */
  editing?: AIReActSchedule
  /** 当前会话；用于新建时默认附着会话与 CreatedFromSessionID */
  activeChat?: AISession
  onClose: () => void
  onSuccess: () => void
}

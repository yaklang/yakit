import type { AIReActSchedule } from '@/pages/ai-re-act/hooks/grpcApi'
import type { Moment } from 'moment'
import type { AISession } from '../../type/aiChat'

export type FrequencyPreset = 'once' | 'minutes' | 'hourly' | 'daily' | 'weekdays' | 'weekly'
/**
 * 手动新建仅支持 new_session_per_run；continue_session 只会在编辑
 * 从会话创建的既有任务时出现，用于原样保留其模式与关联字段。
 */
export type ScheduleTargetMode = 'new_session_per_run' | 'continue_session'

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

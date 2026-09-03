import type { AIReActSchedule } from '@/pages/ai-re-act/hooks/grpcApi'
import type { Moment } from 'moment'

export type FrequencyPreset = 'once' | 'minutes' | 'hourly' | 'daily' | 'weekdays' | 'weekly' | 'custom'
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
  /** Frequency 为 custom 时的自定义 RRULE 规则 */
  CustomRRule: string
}

export interface ScheduledTasksFormProps {
  /** 编辑时的原任务；不传为新建 */
  editing?: AIReActSchedule
  onClose: () => void
  onSuccess: () => void
}

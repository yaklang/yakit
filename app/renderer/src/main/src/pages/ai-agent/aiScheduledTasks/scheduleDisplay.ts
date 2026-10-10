import moment from 'moment'
import type { TFunction } from '@/i18n/useI18nNamespaces'
import type { AIReActSchedule } from '../../ai-re-act/hooks/grpcApi'

const formatTime = (timestamp?: number) => {
  return timestamp && timestamp > 0 ? moment.unix(timestamp).format('HH:mm') : '-'
}

export const formatScheduleRule = (item: AIReActSchedule, t: TFunction) => {
  const rrule = (item.Schedule?.RRule || '').toUpperCase()
  const startTime = formatTime(item.Schedule?.StartAt)
  if (rrule.includes('COUNT=1')) return t('AIScheduledTasks.frequencyOnce')
  if (rrule.includes('FREQ=MINUTELY')) {
    const matched = rrule.match(/(?:^|;)INTERVAL=(\d+)/)
    const interval = Math.max(1, Number(matched?.[1] || 1))
    return t('AIScheduledTasks.everyNMinutes', { n: interval })
  }
  if (rrule.includes('FREQ=HOURLY')) {
    const matched = rrule.match(/(?:^|;)BYMINUTE=(\d+)/)
    if (matched) {
      return t('AIScheduledTasks.everyHourAtMinute', { minute: matched[1].padStart(2, '0') })
    }
    return t('AIScheduledTasks.frequencyHourly')
  }
  if (rrule.includes('BYDAY=MO,TU,WE,TH,FR')) return t('AIScheduledTasks.frequencyWeekdaysAtTime', { time: startTime })
  if (rrule.includes('FREQ=WEEKLY')) {
    const matched = rrule.match(/(?:^|;)BYDAY=([A-Z,]+)/)
    const dayMap: Record<string, string> = {
      SU: t('AIScheduledTasks.sunday'),
      MO: t('AIScheduledTasks.monday'),
      TU: t('AIScheduledTasks.tuesday'),
      WE: t('AIScheduledTasks.wednesday'),
      TH: t('AIScheduledTasks.thursday'),
      FR: t('AIScheduledTasks.friday'),
      SA: t('AIScheduledTasks.saturday'),
    }
    // BYDAY 可能包含多天（如 MO,WE），逐个翻译后拼接展示
    const days = (matched?.[1] || '')
      .split(',')
      .filter(Boolean)
      .map((day) => dayMap[day] || day)
    return t('AIScheduledTasks.everyWeekOnAtTime', {
      day: days.length > 0 ? days.join('、') : '-',
      time: startTime,
    })
  }
  if (rrule.includes('FREQ=DAILY')) {
    const matched = rrule.match(/(?:^|;)INTERVAL=(\d+)/)
    const interval = Math.max(1, Number(matched?.[1] || 1))
    // INTERVAL>1 的「每 N 天」没有专门文案，按自定义规则展示
    if (interval === 1) return t('AIScheduledTasks.frequencyDailyAtTime', { time: startTime })
  }
  // 非空规则未匹配预设时返回 undefined，由标签展示「自定义」及完整规则提示
  return rrule ? undefined : t('AIScheduledTasks.frequencyDailyAtTime', { time: startTime })
}

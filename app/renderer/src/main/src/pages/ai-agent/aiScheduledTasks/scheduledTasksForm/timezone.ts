import moment from 'moment'

/**
 * 定时任务表单的时区锚定工具。
 * 表单墙钟时间（DatePicker 里的 moment 组件）统一以任务自身的 Schedule.Timezone 解释，
 * 与编辑者系统时区解耦：任务在时区 A 创建、在时区 B 编辑（甚至只改名称）时，
 * 不再静默改变执行墙钟时刻 / 执行星期 / 夏令时语义。
 *
 * 依托 Intl（Electron 渲染进程原生可用）计算 IANA 时区偏移，无需 moment-timezone。
 */

/** IANA 时区在指定 Unix 时刻的偏移分钟数（东经为正）；无效时区按 UTC 处理 */
export const timezoneOffsetMinutes = (timezone: string, unixSeconds: number): number => {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
    const parts = formatter.formatToParts(new Date(unixSeconds * 1000))
    const num = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? '0')
    const wallAsUTCMs = Date.UTC(num('year'), num('month') - 1, num('day'), num('hour'), num('minute'), num('second'))
    return Math.round((wallAsUTCMs - unixSeconds * 1000) / 60000)
  } catch {
    return 0
  }
}

/**
 * Unix 时刻 → 按指定时区墙钟组件构造的 moment（本地模式承载组件）。
 * DatePicker 直接展示这些组件（经 YakitDatePicker 的实例换算仍保持组件不变），
 * day() 即该时区下的星期，供 weekly 预设生成 BYDAY。
 */
export const startAtToWallMoment = (unixSeconds?: number | string, timezone = 'UTC'): moment.Moment => {
  const unix = Number(unixSeconds || 0)
  if (!(unix > 0)) return moment()
  const offsetMinutes = timezoneOffsetMinutes(timezone, unix)
  const wall = moment.utc(unix * 1000 + offsetMinutes * 60000)
  return moment([wall.year(), wall.month(), wall.date(), wall.hour(), wall.minute(), wall.second()])
}

/**
 * 墙钟 moment 组件按指定时区解释 → Unix 秒。
 * 先把墙钟视作 UTC 求该时区偏移得到候选时刻，再做自洽校验：
 * - 正常时刻：一遍即自洽；
 * - 跳变后一小时内：偏移已切换，取第二候选；
 * - DST 间隙（不存在的时间，如春令 02:30）：无自洽解，按跳变后时刻解释（03:30）；
 * - 秋令重叠时间：两次出现取先出现的（与主流时区库的默认消歧一致）。
 */
export const wallMomentToUnix = (value: moment.Moment | null | undefined, timezone: string): number => {
  if (!value) return 0
  const wallAsUnix =
    Date.UTC(value.year(), value.month(), value.date(), value.hour(), value.minute(), value.second()) / 1000
  const firstOffset = timezoneOffsetMinutes(timezone, wallAsUnix)
  const firstCandidate = Math.round(wallAsUnix - firstOffset * 60)
  if (timezoneOffsetMinutes(timezone, firstCandidate) === firstOffset) return firstCandidate
  const secondOffset = timezoneOffsetMinutes(timezone, firstCandidate)
  const secondCandidate = Math.round(wallAsUnix - secondOffset * 60)
  if (timezoneOffsetMinutes(timezone, secondCandidate) === secondOffset) return secondCandidate
  // DST 间隙：无自洽解，按跳变后时刻解释
  return firstCandidate
}

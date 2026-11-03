import type { TodoListCardData } from '@/pages/ai-re-act/hooks/aiRender'

export const TASK_BOARD_STATUSES = ['PENDING', 'DOING', 'DONE', 'SKIPPED_DELETED'] as const

/** 按官方四列归组，保留输入顺序；不认识的状态单独保留，避免静默丢卡片。 */
export const groupTaskBoardItems = (items: TodoListCardData['items'] = []) => {
  const groups: Record<string, TodoListCardData['items']> = Object.fromEntries(
    TASK_BOARD_STATUSES.map((key) => [key, []]),
  )
  for (const item of items) {
    const key =
      item.status === 'SKIPPED' || item.status === 'DELETED'
        ? 'SKIPPED_DELETED'
        : item.status === 'PENDING' || item.status === 'DOING' || item.status === 'DONE'
          ? item.status
          : 'OTHER'
    ;(groups[key] ||= []).push(item)
  }
  return groups
}

/** 仅真实时间字段可进入时间展示；兼容毫秒，排除 0 / 1 / 递增序号。 */
export const toTaskUnixSeconds = (value?: number) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0
  const seconds = value >= 1e12 ? value / 1000 : value
  return seconds > 1e9 && seconds < 1e11 ? seconds : 0
}

export const formatTaskDuration = (seconds?: number) => {
  if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds < 0) return '—'
  const total = Math.floor(seconds)
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  return `${hours ? `${hours}h` : ''}${minutes ? `${minutes}m` : ''}${total % 60}s`
}

export const taskFocusDuration = (item: TodoListCardData['items'][number], nowSeconds: number) => {
  if (typeof item.focus_seconds === 'number' && Number.isFinite(item.focus_seconds) && item.focus_seconds >= 0)
    return item.focus_seconds
  const start = toTaskUnixSeconds(item.focus_started_ts)
  const end = toTaskUnixSeconds(item.closed_ts)
  if (!start || (item.status !== 'DOING' && !end)) return undefined
  return Math.max(0, (end || nowSeconds) - start)
}

import { AIToDoListStatusEnum } from '@/pages/ai-agent/defaultConstant'
import { TodoListCardData } from '@/pages/ai-re-act/hooks/aiRender'

export interface DigitalEmployeeTaskProgressSummary {
  items: TodoListCardData['items']
  completed: number
  percent: number
  total: number
}

const MIN_VALID_TASK_TIMESTAMP = Date.UTC(2000, 0, 1)

export const getDigitalEmployeeTaskProgress = (todoData?: TodoListCardData): DigitalEmployeeTaskProgressSummary => {
  const items = (todoData?.items || []).filter((item) => item.status !== AIToDoListStatusEnum.Deleted)
  const total = items.length
  const completed = items.filter(
    (item) => item.status === AIToDoListStatusEnum.Done || item.status === AIToDoListStatusEnum.Skipped,
  ).length

  return {
    items,
    completed,
    percent: total ? Math.round((completed / total) * 100) : 0,
    total,
  }
}

export const formatTaskTimestamp = (timestamp?: number, now = Date.now()): string => {
  if (!timestamp || timestamp < 0) return ''
  const time = timestamp < 1_000_000_000_000 ? timestamp * 1000 : timestamp
  if (time < MIN_VALID_TASK_TIMESTAMP) return ''
  const date = new Date(time)
  if (Number.isNaN(date.getTime())) return ''

  const pad = (value: number) => `${value}`.padStart(2, '0')
  const timeText = `${pad(date.getHours())}:${pad(date.getMinutes())}`
  const current = new Date(now)
  const isToday =
    date.getFullYear() === current.getFullYear() &&
    date.getMonth() === current.getMonth() &&
    date.getDate() === current.getDate()

  return isToday ? timeText : `${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${timeText}`
}

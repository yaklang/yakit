import type { TodoListCardData } from '@/pages/ai-re-act/hooks/aiRender'
import type { AITaskGanttSegmentKind } from './aiTaskGantt/type'

/** 统计项 / 图例默认从左到右：进行中、待处理、已完成、已跳过、已删除 */
export const TODO_STATUS_FILTER_KEYS = ['doing', 'pending', 'done', 'skipped', 'deleted'] as const
export type TodoStatusFilterKey = (typeof TODO_STATUS_FILTER_KEYS)[number]

export const TODO_STATUS_TO_FILTER_KEY: Record<string, TodoStatusFilterKey> = {
  PENDING: 'pending',
  DOING: 'doing',
  DONE: 'done',
  SKIPPED: 'skipped',
  DELETED: 'deleted',
}

/** 行状态筛选 key → 进度图例 kind（反向表由本表派生） */
export const FILTER_KEY_TO_GANTT_LEGEND: Record<TodoStatusFilterKey, AITaskGanttSegmentKind> = {
  pending: 'wait',
  doing: 'execute',
  done: 'success',
  skipped: 'skipped',
  deleted: 'failed',
}

/** 进度图例 kind → 行状态筛选 key */
export const GANTT_LEGEND_TO_FILTER_KEY = (Object.keys(FILTER_KEY_TO_GANTT_LEGEND) as TodoStatusFilterKey[]).reduce(
  (acc, key) => {
    acc[FILTER_KEY_TO_GANTT_LEGEND[key]] = key
    return acc
  },
  {} as Record<AITaskGanttSegmentKind, TodoStatusFilterKey>,
)

/** 拖拽状态统计项后，按目标位置重排（已创建不参与） */
export const reorderFilterKeys = (
  order: readonly TodoStatusFilterKey[],
  fromKey: string,
  toKey: string,
): TodoStatusFilterKey[] => {
  const next = order.slice()
  const from = next.indexOf(fromKey as TodoStatusFilterKey)
  const to = next.indexOf(toKey as TodoStatusFilterKey)
  if (from < 0 || to < 0 || from === to) return next
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}

/** 待办按状态统计从左到右的顺序排序，同状态保持原相对顺序 */
export const sortTodoItemsByStatusOrder = <T extends { status: string }>(
  items: T[],
  order: readonly TodoStatusFilterKey[],
): T[] => {
  if (!items.length || !order.length) return items
  const rank = new Map(order.map((key, i) => [key, i]))
  return items
    .map((item, i) => ({ item, i }))
    .sort((a, b) => {
      const ar = rank.get(TODO_STATUS_TO_FILTER_KEY[a.item.status] || '') ?? order.length
      const br = rank.get(TODO_STATUS_TO_FILTER_KEY[b.item.status] || '') ?? order.length
      return ar - br || a.i - b.i
    })
    .map((entry) => entry.item)
}

/** 三种视图共用：统计始终基于全量；筛选和排序仅改变呈现，不修改流数据。 */
export const getTaskTodoPresentation = (
  items: TodoListCardData['items'],
  hiddenKeys: readonly TodoStatusFilterKey[],
  order: readonly TodoStatusFilterKey[],
) => {
  const hidden = new Set(hiddenKeys)
  const allHidden = TODO_STATUS_FILTER_KEYS.every((key) => hidden.has(key))
  const counts: Record<string, number> = Object.fromEntries(
    ['created', ...TODO_STATUS_FILTER_KEYS].map((key) => [key, 0]),
  )
  counts.created = items.length
  for (const item of items) {
    const key = TODO_STATUS_TO_FILTER_KEY[item.status]
    if (key) counts[key] += 1
  }
  const visibleItems = sortTodoItemsByStatusOrder(
    items.filter((item) => {
      const key = TODO_STATUS_TO_FILTER_KEY[item.status]
      return key ? !hidden.has(key) : !allHidden
    }),
    order,
  )
  return {
    counts,
    visibleItems,
    unFinish: visibleItems.filter((item) => !['DONE', 'SKIPPED', 'DELETED'].includes(item.status)),
    finished: visibleItems.filter((item) => ['DONE', 'SKIPPED', 'DELETED'].includes(item.status)),
  }
}

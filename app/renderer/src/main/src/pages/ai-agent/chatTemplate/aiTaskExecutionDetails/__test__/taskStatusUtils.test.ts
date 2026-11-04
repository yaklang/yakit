import { describe, expect, it } from 'vitest'
import {
  TODO_STATUS_FILTER_KEYS,
  FILTER_KEY_TO_GANTT_LEGEND,
  GANTT_LEGEND_TO_FILTER_KEY,
  getTaskTodoPresentation,
  reorderFilterKeys,
  sortTodoItemsByStatusOrder,
} from '../taskStatusUtils'
import type { TodoListCardData } from '@/pages/ai-re-act/hooks/aiRender'
const items: TodoListCardData['items'] = ['PENDING', 'DONE', 'DOING', 'SKIPPED', 'DELETED', 'PENDING'].map(
  (status, index) => ({
    id: `${index}`,
    content: `step ${index}`,
    status: status as any,
    created_at: 1,
    updated_at: 1,
  }),
)
describe('shared task filtering and display order', () => {
  it('counts the full source even while filtering and never mutates it', () => {
    const before = JSON.stringify(items)
    const data = getTaskTodoPresentation(items, ['pending'], TODO_STATUS_FILTER_KEYS)
    expect(data.counts).toEqual({ created: 6, pending: 2, doing: 1, done: 1, skipped: 1, deleted: 1 })
    expect(data.visibleItems.map((x) => x.status)).toEqual(['DOING', 'DONE', 'SKIPPED', 'DELETED'])
    expect(data.unFinish.map((x) => x.status)).toEqual(['DOING'])
    expect(data.finished).toHaveLength(3)
    expect(JSON.stringify(items)).toBe(before)
  })
  it.each(TODO_STATUS_FILTER_KEYS)('filters %s independently and keeps other statuses', (key) => {
    const status = key.toUpperCase()
    const data = getTaskTodoPresentation(items, [key], TODO_STATUS_FILTER_KEYS)
    expect(data.visibleItems.some((x) => x.status === status)).toBe(false)
    expect(data.counts.created).toBe(items.length)
    expect(data.visibleItems.length).toBe(items.filter((x) => x.status !== status).length)
  })
  it('supports all-hidden and empty task data without changing total counts', () => {
    expect(getTaskTodoPresentation(items, TODO_STATUS_FILTER_KEYS, TODO_STATUS_FILTER_KEYS).visibleItems).toEqual([])
    const empty = getTaskTodoPresentation([], [], TODO_STATUS_FILTER_KEYS)
    expect(empty.counts.created).toBe(0)
    expect(empty.unFinish).toEqual([])
    expect(empty.finished).toEqual([])
  })
  it('retains unknown states at the end and hides them with the total control', () => {
    const other = { ...items[0], id: 'other', status: 'FUTURE' as any }
    const data = getTaskTodoPresentation([...items, other], [], TODO_STATUS_FILTER_KEYS)
    expect(data.visibleItems[data.visibleItems.length - 1]).toBe(other)
    expect(data.unFinish).toContain(other)
    expect(data.counts.created).toBe(7)
    expect(
      getTaskTodoPresentation([...items, other], TODO_STATUS_FILTER_KEYS, TODO_STATUS_FILTER_KEYS).visibleItems,
    ).toEqual([])
  })
  it('sorts by status stably and returns the same source objects', () => {
    const sorted = sortTodoItemsByStatusOrder(items, ['done', 'pending', 'doing', 'deleted', 'skipped'])
    expect(sorted.map((x) => x.id)).toEqual(['1', '0', '5', '2', '4', '3'])
    expect(sorted[1]).toBe(items[0])
    expect(items[0].id).toBe('0')
  })
  it.each([
    ['doing', 'pending'],
    ['pending', 'doing'],
    ['doing', 'deleted'],
    ['deleted', 'doing'],
  ] as const)('moves %s into the %s slot, including adjacent moves both ways', (from, to) => {
    const result = reorderFilterKeys(TODO_STATUS_FILTER_KEYS, from, to)
    expect(result[TODO_STATUS_FILTER_KEYS.indexOf(to)]).toBe(from)
    expect(result).toHaveLength(5)
    expect(new Set(result).size).toBe(5)
    expect(TODO_STATUS_FILTER_KEYS).toEqual(['doing', 'pending', 'done', 'skipped', 'deleted'])
  })
  it.each([
    ['created', 'pending'],
    ['doing', 'created'],
    ['bad', 'pending'],
    ['done', 'done'],
  ])('ignores invalid or unchanged reorder %s to %s', (from, to) => {
    expect(reorderFilterKeys(TODO_STATUS_FILTER_KEYS, from, to)).toEqual(TODO_STATUS_FILTER_KEYS)
  })
  it('uses the same reversible legend mapping for all five statuses', () => {
    for (const key of TODO_STATUS_FILTER_KEYS)
      expect(GANTT_LEGEND_TO_FILTER_KEY[FILTER_KEY_TO_GANTT_LEGEND[key]]).toBe(key)
  })
})

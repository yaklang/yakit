import { describe, expect, it } from 'vitest'
import { formatTaskDuration, groupTaskBoardItems, taskFocusDuration, toTaskUnixSeconds } from '../boardUtils'
import type { TodoListCardData } from '@/pages/ai-re-act/hooks/aiRender'

type Item = TodoListCardData['items'][number]
const item = (data: Partial<Item>) =>
  ({ content: '', id: '', created_at: 0, updated_at: 0, status: 'PENDING', ...data }) as Item

describe('read-only task board data boundaries', () => {
  it('groups every real status, keeps order, and does not mutate the engine input', () => {
    const items = ['PENDING', 'DOING', 'DONE', 'SKIPPED', 'DELETED', 'PENDING'].map((status, id) =>
      Object.freeze(item({ status: status as Item['status'], id: String(id) })),
    )
    Object.freeze(items)
    const grouped = groupTaskBoardItems(items)
    expect(grouped.PENDING.map((entry) => entry.id)).toEqual(['0', '5'])
    expect(grouped.SKIPPED_DELETED.map((entry) => entry.id)).toEqual(['3', '4'])
    expect(Object.values(grouped).flat()).toHaveLength(6)
    expect(items.map((entry) => entry.id)).toEqual(['0', '1', '2', '3', '4', '5'])
  })
  it('keeps unknown engine statuses visible and creates empty columns', () => {
    const grouped = groupTaskBoardItems([item({ status: 'UNKNOWN' as Item['status'] })])
    expect(grouped.OTHER).toHaveLength(1)
    expect(grouped.DOING).toHaveLength(0)
    expect(Object.keys(groupTaskBoardItems())).toHaveLength(4)
  })
  it.each([undefined, 0, 1, -1, 55, NaN, Infinity])(
    'does not render sequence or invalid timestamp %s as time',
    (value) => {
      expect(toTaskUnixSeconds(value)).toBe(0)
    },
  )
  it.each([1700000000, 1700000000000])('normalizes timestamp %s to Unix seconds', (value) => {
    expect(toTaskUnixSeconds(value)).toBe(1700000000)
  })
  it('uses measured focus duration, including zero, instead of queue lifetime', () => {
    expect(
      taskFocusDuration(item({ focus_seconds: 0, created_ts: 1700000000, focus_started_ts: 1700000500 }), 1700001000),
    ).toBe(0)
    expect(taskFocusDuration(item({ focus_seconds: 66 }), 1700001000)).toBe(66)
  })
  it('does not treat creation time as execution start or extend completed tasks to now', () => {
    expect(taskFocusDuration(item({ status: 'DOING', created_ts: 1700000000 }), 1700001000)).toBeUndefined()
    expect(taskFocusDuration(item({ status: 'DONE', focus_started_ts: 1700000500 }), 1700001000)).toBeUndefined()
    expect(
      taskFocusDuration(item({ status: 'DONE', focus_started_ts: 1700000500, closed_ts: 1700000566 }), 1700001000),
    ).toBe(66)
    expect(taskFocusDuration(item({ status: 'DOING', focus_started_ts: 1700000500 }), 1700001000)).toBe(500)
  })
  it.each([
    [0, '0s'],
    [66, '1m6s'],
    [9015, '2h30m15s'],
    [undefined, '—'],
    [-1, '—'],
    [Infinity, '—'],
  ] as const)('formats duration %s as %s', (value, expected) => {
    expect(formatTaskDuration(value)).toBe(expected)
  })
})

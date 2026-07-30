import { describe, expect, it } from 'vitest'
import { AIToDoListStatusEnum } from '@/pages/ai-agent/defaultConstant'
import { formatTaskTimestamp, getDigitalEmployeeTaskProgress } from '../taskProgress'

describe('digital employee task progress', () => {
  it('reports the current step and ignores deleted steps', () => {
    const progress = getDigitalEmployeeTaskProgress({
      uuid: 'todo-1',
      stats: { deleted: 1, doing: 1, done: 1, pending: 1, skipped: 0 },
      items: [
        { id: '1', content: '理解需求', status: AIToDoListStatusEnum.Done, created_at: 1, updated_at: 2 },
        { id: '2', content: '执行检查', status: AIToDoListStatusEnum.Doing, created_at: 2, updated_at: 3 },
        { id: '3', content: '输出报告', status: AIToDoListStatusEnum.Pending, created_at: 3, updated_at: 3 },
        { id: '4', content: '废弃步骤', status: AIToDoListStatusEnum.Deleted, created_at: 3, updated_at: 3 },
      ],
    })

    expect(progress).toMatchObject({ completed: 1, percent: 33, total: 3 })
    expect(progress.items.map((item) => item.id)).toEqual(['1', '2', '3'])
  })

  it('formats the real backend timestamp in seconds or milliseconds', () => {
    const now = new Date(2026, 6, 30, 15, 0).getTime()
    const today = new Date(2026, 6, 30, 14, 8).getTime()
    const yesterday = new Date(2026, 6, 29, 9, 5).getTime()

    expect(formatTaskTimestamp(today / 1000, now)).toBe('14:08')
    expect(formatTaskTimestamp(yesterday, now)).toBe('07-29 09:05')
    expect(formatTaskTimestamp(0, now)).toBe('')
  })
})

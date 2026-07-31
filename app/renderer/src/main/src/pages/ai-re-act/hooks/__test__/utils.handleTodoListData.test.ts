import { describe, it, expect } from 'vitest'
import { handleTodoListData } from '../utils'
import { AIToDoListStatusEnum } from '@/pages/ai-agent/defaultConstant'

describe('handleTodoListData', () => {
  it('B8: filters by scope and counts stats', () => {
    const items = [
      { id: '1', status: AIToDoListStatusEnum.Pending, scope_task_id: '' },
      { id: '2', status: AIToDoListStatusEnum.Doing, scope_task_id: 't1' },
      { id: '3', status: AIToDoListStatusEnum.Done, scope_task_id: 't1' },
      { id: '4', status: AIToDoListStatusEnum.Skipped, scope_task_id: 't2' },
    ] as any[]

    const scoped = handleTodoListData(items, 't1')
    expect(scoped.items.map((i) => i.id)).toEqual(['2', '3'])
    expect(scoped.stats).toMatchObject({ doing: 1, done: 1, pending: 0, skipped: 0, deleted: 0 })
    expect(scoped.uuid).toBeTruthy()

    const root = handleTodoListData(items, '')
    expect(root.items.map((i) => i.id)).toEqual(['1'])
  })
})

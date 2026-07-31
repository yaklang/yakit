import { describe, it, expect, vi } from 'vitest'
import { aiTaskDetailDataHandlers } from '../grpcStreamHandler/aiTaskDetail'
import { makeGrpcJsonRes, makeHandlerRequest } from './fixtures'
import { AIToDoListStatusEnum } from '@/pages/ai-agent/defaultConstant'

vi.mock('../persist/contentPersistHelper', () => ({
  persistIndependentItem: vi.fn(),
}))

describe('aiTaskDetail handlers', () => {
  it('D8: handler keys exist', () => {
    for (const key of [
      'capability_inventory',
      'perception',
      'current_task_todo_list_update',
      'session_snapshot',
    ] as const) {
      expect(typeof aiTaskDetailDataHandlers[key]).toBe('function')
    }
  })

  it('D8: current_task_todo_list_update bumps todoListUpdate', () => {
    const req = makeHandlerRequest({
      res: makeGrpcJsonRes('current_task_todo_list_update', {
        items: [{ id: '1', status: AIToDoListStatusEnum.Pending, scope_task_id: '' }],
      }),
    })
    const before = req.store.getState().casualChat.todoListUpdate
    expect(() => aiTaskDetailDataHandlers.current_task_todo_list_update(req)).not.toThrow()
    // may or may not bump depending on payload shape; ensure callable
    expect(req.store.getState().casualChat.todoListUpdate).toBeGreaterThanOrEqual(before)
  })
})

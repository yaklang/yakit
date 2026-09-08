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

  it('D8: current_task_todo_list_update bumps chatTodoListUpdate and populates taskDetailsMap (reAct)', () => {
    const taskId = 'task-detail-1'
    const req = makeHandlerRequest({
      res: makeGrpcJsonRes(
        'current_task_todo_list_update',
        {
          items: [
            { id: '1', status: AIToDoListStatusEnum.Pending, scope_task_id: taskId },
            { id: '2', status: AIToDoListStatusEnum.Pending, scope_task_id: '' },
          ],
          task_id: taskId,
        },
        { NodeId: 'current_task_todo_list', TaskId: taskId },
      ),
      chatType: 'reAct',
    })
    const before = req.store.getState().chatTodoListUpdate
    aiTaskDetailDataHandlers.current_task_todo_list_update(req)
    // reAct 分支应触发 chatTodoListUpdate
    expect(req.store.getState().chatTodoListUpdate).toBeGreaterThan(before)
    // taskDetailsMap 应写入对应 taskId 的条目
    const detail = req.rawData.taskDetailsMap.get(taskId)
    expect(detail).toBeDefined()
    expect(detail!.todoList.items.length).toBeGreaterThan(0)
  })

  it('D8: current_task_todo_list_update with task chatType does not bump chatTodoListUpdate but still writes taskDetailsMap', () => {
    const taskId = 'task-detail-2'
    const req = makeHandlerRequest({
      res: makeGrpcJsonRes(
        'current_task_todo_list_update',
        {
          items: [{ id: '1', status: AIToDoListStatusEnum.Pending, scope_task_id: '' }],
          task_id: taskId,
        },
        { NodeId: 'current_task_todo_list', TaskId: taskId },
      ),
      chatType: 'task',
    })
    const before = req.store.getState().chatTodoListUpdate
    aiTaskDetailDataHandlers.current_task_todo_list_update(req)
    // task 分支不应触发 chatTodoListUpdate
    expect(req.store.getState().chatTodoListUpdate).toBe(before)
    // 但 taskDetailsMap 仍应写入
    expect(req.rawData.taskDetailsMap.get(taskId)).toBeDefined()
  })

  it('session_snapshot writes flow/risk aggregates and ignores stale revisions', () => {
    const taskId = 'task-snapshot-1'
    const snapshot = {
      revision: 2,
      execution: {
        http_flow_count: 42,
        risk_count: 22,
        risk_level_count: { critical: 4, high: 6, warning: 1, low: 3, info: 5, other: 3, total: 22 },
      },
      background_processes: [],
    }
    const req = makeHandlerRequest({
      res: makeGrpcJsonRes('structured', snapshot, {
        NodeId: 'session_snapshot',
        TaskId: taskId,
        IsJson: true,
        IsSystem: true,
      }),
    })

    aiTaskDetailDataHandlers.session_snapshot(req)
    const detail = req.rawData.taskDetailsMap.get(taskId)
    expect(detail?.execution?.http_flow_count).toBe(42)
    expect(detail?.execution?.risk_level_count).toEqual(snapshot.execution.risk_level_count)
    expect(detail?.sessionSnapshotRevision).toBe(2)

    const staleRequest = makeHandlerRequest({
      rawData: req.rawData,
      store: req.store,
      res: makeGrpcJsonRes(
        'structured',
        { ...snapshot, revision: 1, execution: { ...snapshot.execution, http_flow_count: 7 } },
        { NodeId: 'session_snapshot', TaskId: taskId, IsJson: true, IsSystem: true },
      ),
    })
    aiTaskDetailDataHandlers.session_snapshot(staleRequest)
    expect(req.rawData.taskDetailsMap.get(taskId)?.execution?.http_flow_count).toBe(42)
  })
})

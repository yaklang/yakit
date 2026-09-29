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

  it('session_snapshot ignores responses that are not structured', () => {
    const taskId = 'task-snapshot-unstructured'
    const req = makeHandlerRequest({
      res: makeGrpcJsonRes(
        'session_snapshot',
        { revision: 1, execution: { http_flow_count: 99 } },
        { NodeId: 'session_snapshot', TaskId: taskId, IsJson: true, IsSystem: true },
      ),
    })

    aiTaskDetailDataHandlers.session_snapshot(req)

    expect(req.rawData.taskDetailsMap.has(taskId)).toBe(false)
  })

  it('current_task_todo_list_update records iteration_index as step', () => {
    const taskId = 'task-iteration-todo'
    const req = makeHandlerRequest({
      res: makeGrpcJsonRes(
        'current_task_todo_list_update',
        { items: [], task_id: taskId, iteration_index: 7 },
        { NodeId: 'current_task_todo_list', TaskId: taskId },
      ),
    })
    aiTaskDetailDataHandlers.current_task_todo_list_update(req)
    expect(req.rawData.taskDetailsMap.get(taskId)?.execution?.execution_rounds).toBe(7)
  })

  it('session_snapshot keeps client-side step when overwriting execution', () => {
    const taskId = 'task-iteration-snapshot'
    const todoReq = makeHandlerRequest({
      res: makeGrpcJsonRes(
        'current_task_todo_list_update',
        { items: [], task_id: taskId, iteration_index: 5 },
        { NodeId: 'current_task_todo_list', TaskId: taskId },
      ),
    })
    aiTaskDetailDataHandlers.current_task_todo_list_update(todoReq)

    const snapshotReq = makeHandlerRequest({
      rawData: todoReq.rawData,
      store: todoReq.store,
      res: makeGrpcJsonRes(
        'structured',
        { revision: 1, execution: { http_flow_count: 1 }, background_processes: [] },
        { NodeId: 'session_snapshot', TaskId: taskId, IsJson: true, IsSystem: true },
      ),
    })
    aiTaskDetailDataHandlers.session_snapshot(snapshotReq)

    const detail = todoReq.rawData.taskDetailsMap.get(taskId)
    expect(detail?.execution?.http_flow_count).toBe(1)
    expect(detail?.execution?.execution_rounds).toBe(5)
  })

  it('session_snapshot merges execution_rounds into step and never regresses', () => {
    const taskId = 'task-snapshot-rounds'
    const firstReq = makeHandlerRequest({
      res: makeGrpcJsonRes(
        'structured',
        { revision: 1, execution: { http_flow_count: 1, execution_rounds: 6 }, background_processes: [] },
        { NodeId: 'session_snapshot', TaskId: taskId, IsJson: true, IsSystem: true },
      ),
    })
    const { rawData } = firstReq
    const makeFollowUpReq = (revision: number, execution_rounds: number) =>
      makeHandlerRequest({
        rawData,
        res: makeGrpcJsonRes(
          'structured',
          { revision, execution: { http_flow_count: 1, execution_rounds }, background_processes: [] },
          { NodeId: 'session_snapshot', TaskId: taskId, IsJson: true, IsSystem: true },
        ),
      })

    // 快照自带的 execution_rounds 应写入 step
    aiTaskDetailDataHandlers.session_snapshot(firstReq)
    expect(rawData.taskDetailsMap.get(taskId)?.execution?.execution_rounds).toBe(6)

    // 后续快照 execution_rounds 变小时(事件乱序/回放)不回退已记录的步数
    aiTaskDetailDataHandlers.session_snapshot(makeFollowUpReq(2, 4))
    expect(rawData.taskDetailsMap.get(taskId)?.execution?.execution_rounds).toBe(6)

    // execution_rounds 变大时正常前进
    aiTaskDetailDataHandlers.session_snapshot(makeFollowUpReq(3, 9))
    expect(rawData.taskDetailsMap.get(taskId)?.execution?.execution_rounds).toBe(9)
  })
})

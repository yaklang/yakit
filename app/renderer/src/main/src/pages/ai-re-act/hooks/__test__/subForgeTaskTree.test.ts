import { describe, it, expect } from 'vitest'
import { handleSubForgeTaskTree } from '../grpcStreamHandler/subForgeTaskTree'
import { makeGrpcJsonRes, makeHandlerRequest } from './fixtures'
import { mergeSubForgeRun, parseSubForgeTaskTree } from '../subForgeTaskTree'

const snapshot = {
  parent_coordinator_id: 'parent',
  parent_task_id: 'task-1',
  parent_task_uuid: 'attempt-1',
  call_tool_id: 'call-1',
  child_coordinator_id: 'child-1',
  tool_name: 'inventory',
  revision: 2,
  status: 'running' as const,
  task_tree: { name: 'Inspect', subtasks: [{ task_id: 'node-1', name: 'Read', progress: 'processing' as const }] },
}

describe('sub-Forge snapshots', () => {
  it('updates individual nodes without replacing parent plan or task state', () => {
    const req = makeHandlerRequest({
      res: makeGrpcJsonRes('sub_forge_task_tree', snapshot, { CoordinatorId: 'parent' }),
    })
    const parent = req.store.getState().currentPlan
    const status = req.store.getState().currentChatStatus
    handleSubForgeTaskTree(req)
    expect(req.store.getState().subForgeRuns['child-1'].task_tree?.subtasks?.[0].progress).toBe('processing')
    req.res = makeGrpcJsonRes(
      'sub_forge_task_tree',
      {
        ...snapshot,
        revision: 3,
        task_tree: {
          name: 'Inspect',
          subtasks: [
            { task_id: 'node-1', name: 'Read', progress: 'completed' },
            { task_id: 'node-2', name: 'Verify', progress: 'processing' },
          ],
        },
      },
      { CoordinatorId: 'parent' },
    )
    handleSubForgeTaskTree(req)
    expect(req.store.getState().subForgeRuns['child-1'].task_tree?.subtasks?.map((node) => node.progress)).toEqual([
      'completed',
      'processing',
    ])
    expect(req.store.getState().currentPlan).toBe(parent)
    expect(req.store.getState().currentChatStatus).toBe(status)
  })

  it('keeps terminal results through duplicates, descending history and late running snapshots', () => {
    const end = mergeSubForgeRun(undefined, { ...snapshot, revision: 4, status: 'succeeded' }, true)
    expect(mergeSubForgeRun(end, snapshot, true)).toBe(end)
    expect(mergeSubForgeRun(end, snapshot, false)).toBe(end)
    expect(mergeSubForgeRun(end, { ...snapshot, revision: 4, status: 'succeeded' }, true)).toBe(end)
  })

  it('distinguishes incomplete replay from live updates and prefers live on equal revision', () => {
    const history = mergeSubForgeRun(undefined, snapshot, true)
    expect(history.historical).toBe(true)
    const live = mergeSubForgeRun(history, snapshot, false)
    expect(live.historical).toBe(false)
    expect(mergeSubForgeRun(live, snapshot, true)).toBe(live)
  })

  it('isolates repeated calls and separate sessions', () => {
    const req = makeHandlerRequest({
      res: makeGrpcJsonRes('sub_forge_task_tree', snapshot, { CoordinatorId: 'parent' }),
    })
    handleSubForgeTaskTree(req)
    req.res = makeGrpcJsonRes(
      'sub_forge_task_tree',
      { ...snapshot, child_coordinator_id: 'child-2', call_tool_id: 'call-2', parent_task_uuid: 'attempt-2' },
      { CoordinatorId: 'parent' },
    )
    handleSubForgeTaskTree(req)
    expect(Object.keys(req.store.getState().subForgeRuns)).toHaveLength(2)
    expect(makeHandlerRequest({ res: makeGrpcJsonRes('plan', {}) }).store.getState().subForgeRuns).toEqual({})
  })

  it('rejects malformed snapshots and mismatched parent envelopes', () => {
    for (const value of [
      null,
      {},
      { ...snapshot, revision: 0 },
      { ...snapshot, task_tree: { name: 'bad', subtasks: {} } },
    ]) {
      expect(parseSubForgeTaskTree(JSON.stringify(value))).toBeUndefined()
    }
    const req = makeHandlerRequest({
      res: makeGrpcJsonRes('sub_forge_task_tree', snapshot, { CoordinatorId: 'wrong' }),
    })
    handleSubForgeTaskTree(req)
    expect(req.store.getState().subForgeRuns).toEqual({})
  })
})

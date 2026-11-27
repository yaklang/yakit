import { describe, it, expect } from 'vitest'
import {
  applySubForgeSnapshot,
  dropSubForgeRunsByParent,
  freezeRunningSubForgeRuns,
  handleSubForgeTaskTree,
} from '../grpcStreamHandler/subForgeTaskTree'
import { aiOtherDataHandlers } from '../grpcStreamHandler/aiOther'
import { handleTaskPlanEnd } from '../utils'
import { makeGrpcJsonRes, makeHandlerRequest, createTestSession } from './fixtures'
import { AITaskStatus } from '../grpcApi'

const snapshot = {
  parent_coordinator_id: 'parent',
  parent_task_id: 'task-1',
  parent_task_uuid: 'attempt-1',
  call_tool_id: 'call-1',
  child_coordinator_id: 'child-1',
  tool_name: 'inventory',
  revision: 2,
  status: 'running' as const,
  task_tree: null,
}

describe('subForgeRuns', () => {
  it('stores a live snapshot and ignores a mismatched parent envelope', () => {
    const req = makeHandlerRequest({
      res: makeGrpcJsonRes('sub_forge_task_tree', snapshot, { CoordinatorId: 'parent' }),
    })
    handleSubForgeTaskTree(req)
    expect(req.store.getState().subForgeRuns['child-1']).toMatchObject({ ...snapshot, historical: false })
    req.res = makeGrpcJsonRes('sub_forge_task_tree', snapshot, { CoordinatorId: 'child-1' })
    handleSubForgeTaskTree(req)
    expect(req.store.getState().subForgeRuns['child-1'].parent_coordinator_id).toBe('parent')
    req.res = makeGrpcJsonRes('sub_forge_task_tree', snapshot, { CoordinatorId: 'wrong' })
    handleSubForgeTaskTree(req)
    expect(req.store.getState().subForgeRuns['child-1'].parent_coordinator_id).toBe('parent')
  })

  it('keeps a higher revision and does not unfreeze historical running with a delayed live running event', () => {
    const terminal = applySubForgeSnapshot({}, { ...snapshot, revision: 4, status: 'succeeded' }, true)
    expect(applySubForgeSnapshot(terminal, snapshot, false)['child-1'].status).toBe('succeeded')
    const frozen = applySubForgeSnapshot({}, snapshot, true)
    expect(applySubForgeSnapshot(frozen, snapshot, false)['child-1'].historical).toBe(true)
  })

  it('upgrades same-revision running to succeeded', () => {
    const live = applySubForgeSnapshot({}, snapshot, false)
    expect(applySubForgeSnapshot(live, { ...snapshot, status: 'succeeded' }, false)['child-1'].status).toBe('succeeded')
  })

  it('does not mark a live run historical when a higher-revision sync snapshot arrives', () => {
    const live = applySubForgeSnapshot({}, snapshot, false)
    const synced = applySubForgeSnapshot(live, { ...snapshot, revision: 3 }, true)
    expect(synced['child-1']).toMatchObject({ revision: 3, historical: false })
    expect(applySubForgeSnapshot(synced, { ...snapshot, revision: 4 }, false)['child-1'].historical).toBe(false)
  })

  it('keeps historical when a delayed live terminal shares the same revision', () => {
    const frozenDone = applySubForgeSnapshot({}, { ...snapshot, status: 'succeeded' }, true)
    expect(applySubForgeSnapshot(frozenDone, { ...snapshot, status: 'succeeded' }, false)['child-1'].historical).toBe(
      true,
    )
    const frozenRunning = applySubForgeSnapshot({}, snapshot, true)
    const upgraded = applySubForgeSnapshot(frozenRunning, { ...snapshot, status: 'succeeded' }, false)['child-1']
    expect(upgraded).toMatchObject({ status: 'succeeded', historical: true })
  })

  it('drops runs of one parent coordinator and nested descendants', () => {
    const other = { ...snapshot, parent_coordinator_id: 'other', child_coordinator_id: 'child-2' }
    const nested = { ...snapshot, parent_coordinator_id: 'child-1', child_coordinator_id: 'child-1a' }
    const runs = applySubForgeSnapshot(
      applySubForgeSnapshot(applySubForgeSnapshot({}, snapshot, false), nested, false),
      other,
      false,
    )
    expect(Object.keys(dropSubForgeRunsByParent(runs, 'parent'))).toEqual(['child-2'])
  })

  it('keeps a completed plan that still has sub-forge runs and drops one that does not', () => {
    const tree = JSON.stringify({
      name: 'root',
      goal: '',
      progress: '',
      task_id: 'root',
      semantic_identifier: 'root',
      depends_on: [],
      subtasks: [
        {
          name: 'leaf',
          goal: '',
          progress: '',
          task_id: 'leaf',
          semantic_identifier: 'leaf',
          depends_on: [],
          subtasks: [],
        },
      ],
    })
    const progress = (phase: 'Completed' | 'NotCompleted') =>
      JSON.stringify({
        total_tasks: 1,
        completed_tasks: phase === 'Completed' ? 1 : 0,
        skipped_tasks: 0,
        aborted_tasks: 0,
        current_index: 0,
        current_task_index: '',
        current_task: '',
        current_goal: '',
        phase,
        updated_at: 0,
      })
    const req = makeHandlerRequest({
      res: makeGrpcJsonRes(
        'structured',
        {
          session_id: 'session',
          total: 3,
          sub_forge_task_trees: [{ ...snapshot, parent_coordinator_id: 'keep', status: 'succeeded' }],
          records: [
            {
              coordinator_id: 'keep',
              created_at: '',
              created_at_unix: 0,
              session_id: 'session',
              task_progress: progress('Completed'),
              task_tree: tree,
              updated_at: '',
              updated_at_unix: 0,
              root_task_name: '',
            },
            {
              coordinator_id: 'drop',
              created_at: '',
              created_at_unix: 0,
              session_id: 'session',
              task_progress: progress('Completed'),
              task_tree: tree,
              updated_at: '',
              updated_at_unix: 0,
              root_task_name: '',
            },
            {
              coordinator_id: 'open',
              created_at: '',
              created_at_unix: 0,
              session_id: 'session',
              task_progress: progress('NotCompleted'),
              task_tree: tree,
              updated_at: '',
              updated_at_unix: 0,
              root_task_name: '',
            },
          ],
        },
        { NodeId: 'plan_exec_tasks', IsSync: true },
      ),
    })
    aiOtherDataHandlers.plan_exec_tasks(req)
    const records = req.store.getState().planHistoryList.records
    expect(records.map((item) => item.coordinator_id)).toEqual(['keep', 'open'])
    expect(records[0].root_task_name).toBe('root')
    expect(records[0].task_tree.map((item) => item.task_id)).toEqual(['leaf'])
  })

  it('restores plan_exec_tasks snapshots as historical', () => {
    const req = makeHandlerRequest({
      res: makeGrpcJsonRes(
        'structured',
        {
          session_id: 'session',
          total: 0,
          records: [],
          sub_forge_task_trees: [{ ...snapshot, revision: 3, status: 'succeeded' }],
        },
        { NodeId: 'plan_exec_tasks', IsSync: true },
      ),
    })
    aiOtherDataHandlers.plan_exec_tasks(req)
    expect(req.store.getState().subForgeRuns['child-1']).toMatchObject({
      revision: 3,
      status: 'succeeded',
      historical: true,
    })
  })

  it('freezes running children when the parent plan ends', () => {
    const session = createTestSession()
    const running = { ...snapshot, historical: false }
    const nested = {
      ...snapshot,
      parent_coordinator_id: 'child-1',
      child_coordinator_id: 'child-1a',
      historical: false,
    }
    const done = { ...snapshot, child_coordinator_id: 'done', status: 'succeeded' as const, historical: false }
    session.store.getState().updateCurrentChatStatus({ coordinatorId: 'parent' })
    session.store.getState().updateState({ subForgeRuns: { 'child-1': running, 'child-1a': nested, done } })
    handleTaskPlanEnd(session, false)
    expect(session.store.getState().subForgeRuns['child-1'].historical).toBe(true)
    expect(session.store.getState().subForgeRuns['child-1a'].historical).toBe(true)
    expect(session.store.getState().subForgeRuns.done).toBe(done)
    expect(freezeRunningSubForgeRuns({ 'child-1': running }, 'other')['child-1'].historical).toBe(false)
  })

  it('drops previous coordinator runs on a new question dequeue', () => {
    const req = makeHandlerRequest({
      res: makeGrpcJsonRes(
        'structured',
        {
          reason: 'normal',
          react_task_id: 'q-next',
          react_task_input: 'hello',
          focus_mode: '',
          react_task_user_input_uuid: '',
          queue_len: 0,
        },
        { NodeId: 'react_task_dequeue', TaskId: 'q-next' },
      ),
      chatType: 'reAct',
      sendRequest: () => {},
    })
    req.store.getState().updateCurrentChatStatus({ coordinatorId: 'parent' })
    req.store.getState().updateState({ subForgeRuns: applySubForgeSnapshot({}, snapshot, false) })
    aiOtherDataHandlers.react_task_dequeue(req)
    expect(req.store.getState().subForgeRuns['child-1']).toBeUndefined()
  })

  it('does not change the parent plan when a child snapshot arrives', () => {
    const req = makeHandlerRequest({
      res: makeGrpcJsonRes('sub_forge_task_tree', snapshot, { CoordinatorId: 'parent' }),
    })
    const plan = req.store.getState().currentPlan
    handleSubForgeTaskTree(req)
    expect(req.store.getState().currentPlan).toBe(plan)
  })
})

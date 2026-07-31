import { describe, it, expect, vi, beforeEach } from 'vitest'
import { aiOtherDataHandlers } from '../grpcStreamHandler/aiOther'
import { AITaskStatus } from '../grpcApi'
import { DefaultTaskPlanEndGate } from '../defaultConstant'
import { makeGrpcJsonRes, makeHandlerRequest } from './fixtures'

vi.mock('../persist/contentPersistHelper', () => ({
  persistIndependentItem: vi.fn(),
  persistToolResultIfTerminal: vi.fn(),
  upsertSessionContent: vi.fn(),
  drainSessionContentWrites: vi.fn(),
}))

describe('aiOther task plan gate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const startPayload = {
    coordinator_id: 'coord-1',
    're-act_task': 'task-1',
  }

  it('D2: start resets gate and sets processing', () => {
    const sendRequest = vi.fn()
    const req = makeHandlerRequest({
      res: makeGrpcJsonRes('start_plan_and_execution', startPayload),
      sendRequest,
      chatType: 'reAct',
    })
    req.meta.taskPlanEndGate = { endReceived: true, pendingStatus: 'completed' }
    aiOtherDataHandlers.start_plan_and_execution(req)
    expect(req.meta.taskPlanEndGate).toEqual(DefaultTaskPlanEndGate)
    expect(req.store.getState().taskStatus).toMatchObject({
      taskID: 'task-1',
      coordinatorId: 'coord-1',
      status: AITaskStatus.inProgress,
    })
    expect(sendRequest).toHaveBeenCalled()
  })

  it('D2: end then change settles', () => {
    const req = makeHandlerRequest({
      res: makeGrpcJsonRes('end_plan_and_execution', startPayload),
      chatType: 'reAct',
    })
    req.store.getState().updateState({
      taskStatus: {
        plan: '加载中...',
        task: '加载中...',
        taskID: 'task-1',
        status: AITaskStatus.inProgress,
        coordinatorId: 'coord-1',
      },
      cancelTaskLoading: true,
    })

    aiOtherDataHandlers.end_plan_and_execution(req)
    expect(req.store.getState().taskStatus.status).toBe(AITaskStatus.inProgress)
    expect(req.meta.taskPlanEndGate.endReceived).toBe(true)

    const changeReq = {
      ...req,
      res: makeGrpcJsonRes(
        'structured',
        { react_task_id: 'task-1', react_task_now_status: 'completed' },
        { NodeId: 'react_task_status_changed' },
      ),
      chatType: 'reAct' as const,
    }
    aiOtherDataHandlers.react_task_status_changed(changeReq)
    expect(req.store.getState().taskStatus.status).toBe('completed')
    expect(req.store.getState().cancelTaskLoading).toBe(false)
    expect(req.meta.taskPlanEndGate).toEqual(DefaultTaskPlanEndGate)
  })

  it('D2: change then end settles (unordered)', () => {
    const req = makeHandlerRequest({
      res: makeGrpcJsonRes(
        'structured',
        { react_task_id: 'task-1', react_task_now_status: 'aborted' },
        { NodeId: 'react_task_status_changed' },
      ),
      chatType: 'reAct',
    })
    req.store.getState().updateState({
      taskStatus: {
        plan: 'p',
        task: 't',
        taskID: 'task-1',
        status: AITaskStatus.inProgress,
        coordinatorId: 'coord-1',
      },
    })

    aiOtherDataHandlers.react_task_status_changed(req)
    expect(req.store.getState().taskStatus.status).toBe(AITaskStatus.inProgress)
    expect(req.meta.taskPlanEndGate.pendingStatus).toBe('aborted')

    const endReq = {
      ...req,
      res: makeGrpcJsonRes('end_plan_and_execution', startPayload),
    }
    aiOtherDataHandlers.end_plan_and_execution(endReq)
    expect(req.store.getState().taskStatus.status).toBe('aborted')
  })

  it('D2: plan updates task tree when chatType=task', () => {
    const root = {
      root_task: {
        index: '0',
        name: 'root',
        goal: '',
        progress: '',
        task_id: 'root',
        semantic_identifier: 'root',
        depends_on: [],
        subtasks: [
          {
            index: '1',
            name: 'leaf',
            goal: '',
            progress: '',
            task_id: 'leaf-1',
            semantic_identifier: 'L',
            depends_on: [],
            subtasks: [],
          },
        ],
      },
    }
    const req = makeHandlerRequest({
      res: makeGrpcJsonRes('plan', root),
      chatType: 'task',
    })
    aiOtherDataHandlers.plan(req)
    expect(req.store.getState().taskChat.plan.root_task_name).toBe('root')
    expect(req.store.getState().taskChat.plan.task_tree.some((t) => t.task_id === 'leaf-1')).toBe(true)
  })
})

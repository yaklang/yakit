import { describe, it, expect, vi, beforeEach } from 'vitest'
import { aiOtherDataHandlers } from '../grpcStreamHandler/aiOther'
import { AIInputEventSyncTypeEnum, AITaskStatus } from '../grpcApi'
import { DefaultCurrentExecTaskTree, DefaultTaskPlanEndGate } from '../defaultConstant'
import { makeGrpcJsonRes, makeHandlerRequest } from './fixtures'
import { AIChatQSDataTypeEnum } from '../aiRender'
import i18n from '@/i18n/i18n'

const tAgent = i18n.getFixedT(null, 'aiAgent')

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
    expect(req.store.getState().currentChatStatus).toMatchObject({
      questionID: 'task-1',
      coordinatorId: 'coord-1',
      status: AITaskStatus.inProgress,
    })
    expect(req.store.getState().currentLoadingTitle).toMatchObject({
      planTitle: '加载中...',
    })
    expect(req.store.getState().cancelChatLoading).toBe(false)
    expect(sendRequest).toHaveBeenCalledWith({
      IsSyncMessage: true,
      SyncType: AIInputEventSyncTypeEnum.SYNC_TYPE_PLAN_EXEC_TASKS,
    })
    expect(sendRequest).toHaveBeenCalledWith({
      IsSyncMessage: true,
      SyncType: AIInputEventSyncTypeEnum.SYNC_TYPE_PLAN,
    })
  })

  it('D2: start does not reset current plan tree', () => {
    const req = makeHandlerRequest({
      res: makeGrpcJsonRes('start_plan_and_execution', startPayload),
      chatType: 'reAct',
    })
    req.store.getState().updateState({ currentPlan: { root_task_name: 'keep', task_tree: [] } })
    aiOtherDataHandlers.start_plan_and_execution(req)
    expect(req.store.getState().currentPlan.root_task_name).toBe('keep')
  })

  it('D2: end then change settles', () => {
    const req = makeHandlerRequest({
      res: makeGrpcJsonRes('end_plan_and_execution', startPayload),
      chatType: 'reAct',
    })
    req.store.getState().updateState({
      currentChatStatus: {
        questionID: 'task-1',
        status: AITaskStatus.inProgress,
        coordinatorId: 'coord-1',
      },
      currentLoadingTitle: {
        casualTitle: '',
        planTitle: '加载中...',
      },
      cancelChatLoading: true,
    })

    aiOtherDataHandlers.end_plan_and_execution(req)
    expect(req.store.getState().currentChatStatus.status).toBe(AITaskStatus.inProgress)
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
    expect(req.store.getState().currentChatStatus.status).toBe('completed')
    expect(req.store.getState().cancelChatLoading).toBe(false)
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
      currentChatStatus: {
        questionID: 'task-1',
        status: AITaskStatus.inProgress,
        coordinatorId: 'coord-1',
      },
    })

    aiOtherDataHandlers.react_task_status_changed(req)
    expect(req.store.getState().currentChatStatus.status).toBe(AITaskStatus.inProgress)
    expect(req.meta.taskPlanEndGate.pendingStatus).toBe('aborted')

    const endReq = {
      ...req,
      res: makeGrpcJsonRes('end_plan_and_execution', startPayload),
    }
    aiOtherDataHandlers.end_plan_and_execution(endReq)
    expect(req.store.getState().currentChatStatus.status).toBe('aborted')
  })

  it('D2: status_changed without coordinator settles casual directly', () => {
    const req = makeHandlerRequest({
      res: makeGrpcJsonRes(
        'structured',
        { react_task_id: 'q-1', react_task_now_status: 'completed' },
        { NodeId: 'react_task_status_changed' },
      ),
      chatType: 'reAct',
    })
    req.store.getState().updateState({
      currentChatStatus: {
        questionID: 'q-1',
        status: AITaskStatus.inProgress,
        coordinatorId: '',
      },
      focusMode: 'focus',
      cancelChatLoading: true,
    })

    aiOtherDataHandlers.react_task_status_changed(req)
    expect(req.store.getState().currentChatStatus.status).toBe('completed')
    expect(req.store.getState().focusMode).toBe('')
    expect(req.store.getState().cancelChatLoading).toBe(false)
    expect(req.meta.taskPlanEndGate.pendingStatus).toBeUndefined()
  })

  it('D2: dequeue reason=normal updates chat status and refreshes plan list', () => {
    const sendRequest = vi.fn()
    const req = makeHandlerRequest({
      res: makeGrpcJsonRes(
        'structured',
        {
          reason: 'normal',
          react_task_id: 'q-normal',
          react_task_input: 'hello',
          focus_mode: 'focus-a',
          react_task_user_input_uuid: '',
          queue_len: 1,
        },
        { NodeId: 'react_task_dequeue', TaskId: 'q-normal' },
      ),
      chatType: 'reAct',
      sendRequest,
    })
    req.store.getState().updateState({ currentPlan: { root_task_name: 'old-plan', task_tree: [] } })

    aiOtherDataHandlers.react_task_dequeue(req)

    expect(req.store.getState().currentChatStatus).toMatchObject({
      questionID: 'q-normal',
      coordinatorId: '',
      status: AITaskStatus.inProgress,
    })
    // i18n stub 的 t 直接返回 key 本身；与实现使用同一翻译源断言
    expect(req.store.getState().currentLoadingTitle.casualTitle).toBe(tAgent('AIChatLoading.questionExecuting'))
    expect(req.store.getState().focusMode).toBe('focus-a')
    expect(req.store.getState().currentPlan).toEqual(DefaultCurrentExecTaskTree)
    expect(req.store.getState().chatTodoListUpdate).toBe(1)
    expect(req.rawData.taskDetailsMap.has('q-normal')).toBe(true)
    expect(req.rawData.contents.get('q-normal')?.type).toBe(AIChatQSDataTypeEnum.QUESTION)
    expect(sendRequest).toHaveBeenCalledWith({
      IsSyncMessage: true,
      SyncType: AIInputEventSyncTypeEnum.SYNC_TYPE_QUEUE_INFO,
    })
    expect(sendRequest).toHaveBeenCalledWith({
      IsSyncMessage: true,
      SyncType: AIInputEventSyncTypeEnum.SYNC_TYPE_PLAN_EXEC_TASKS,
    })
  })

  it('D2: dequeue ignores non-normal reason', () => {
    const sendRequest = vi.fn()
    const req = makeHandlerRequest({
      res: makeGrpcJsonRes(
        'structured',
        {
          reason: 'cancel',
          react_task_id: 'q-cancel',
          react_task_input: 'skip',
          focus_mode: '',
          react_task_user_input_uuid: '',
          queue_len: 0,
        },
        { NodeId: 'react_task_dequeue', TaskId: 'q-cancel' },
      ),
      chatType: 'reAct',
      sendRequest,
    })

    aiOtherDataHandlers.react_task_dequeue(req)

    expect(req.store.getState().currentChatStatus.questionID).toBe('')
    expect(req.rawData.contents.get('q-cancel')).toBeUndefined()
    expect(sendRequest).not.toHaveBeenCalled()
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
    expect(req.store.getState().currentPlan.root_task_name).toBe('root')
    expect(req.store.getState().currentPlan.task_tree.some((t) => t.task_id === 'leaf-1')).toBe(true)
  })
})

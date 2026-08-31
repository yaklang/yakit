import { describe, it, expect, vi } from 'vitest'
import { aiOtherDataHandlers } from '../grpcStreamHandler/aiOther'
import { DefaultMemoryList } from '../defaultConstant'
import { makeGrpcJsonRes, makeHandlerRequest } from './fixtures'
import { AIChatQSDataTypeEnum, type ChatTaskNodeGroup } from '../aiRender'
import { AITaskStatus } from '../grpcApi'

vi.mock('../persist/contentPersistHelper', () => ({
  persistIndependentItem: vi.fn(),
  persistToolResultIfTerminal: vi.fn(),
  upsertSessionContent: vi.fn(),
}))

describe('aiOther other handlers', () => {
  it('D3: session_title updates rawData', () => {
    const req = makeHandlerRequest({
      res: makeGrpcJsonRes('structured', { title: 'hello-title' }, { NodeId: 'session_title' }),
    })
    aiOtherDataHandlers.session_title(req)
    expect(req.rawData.sessionTitle).toBe('hello-title')
  })

  it('D3: memory_context merges for reAct', () => {
    const lists = {
      ...DefaultMemoryList,
      memories: [{ id: 'm1' }],
      total_memories: 1,
      memory_pool_limit: 10,
      total_size: 1,
    }
    const req = makeHandlerRequest({
      res: makeGrpcJsonRes('memory_context', lists),
      chatType: 'reAct',
    })
    aiOtherDataHandlers.memory_context(req)
    expect(req.meta.casualMemoryList.total_memories).toBe(1)
  })

  it('D3: filesystem pin updates folders', () => {
    const req = makeHandlerRequest({
      res: makeGrpcJsonRes('filesystem_pin_directory', { path: '/tmp/x' }),
    })
    aiOtherDataHandlers.filesystem_pin_directory(req)
    expect(req.store.getState().grpcFolders.some((f) => f.path === '/tmp/x')).toBe(true)
  })

  it('D3: timeline_item appends', () => {
    const req = makeHandlerRequest({
      res: makeGrpcJsonRes('structured', { id: 9, content: 't' }, { NodeId: 'timeline_item' }),
    })
    aiOtherDataHandlers.timeline_item(req)
    expect(req.store.getState().reActTimelines.some((t) => t.id === 9)).toBe(true)
  })

  it('D3: react_task_created initializes TASK_NODE_GROUP loadingTitle', () => {
    const req = makeHandlerRequest({
      res: makeGrpcJsonRes(
        'structured',
        {
          react_task_status: AITaskStatus.inProgress,
          react_user_input: 'sub goal',
          react_task_id: 'sub-1',
          react_task_uuid: 'uuid-1',
          react_task_name: 'sub',
          react_task_is_sub_agent: true,
        },
        { NodeId: 'react_task_created' },
      ),
      chatType: 'reAct',
    })
    req.store.getState().updateCurrentChatStatus({
      questionID: 'q1',
      status: AITaskStatus.inProgress,
      coordinatorId: '',
    })
    aiOtherDataHandlers.react_task_created(req)
    const node = req.rawData.contents.get('q1-sub-1') as ChatTaskNodeGroup | undefined
    expect(node?.type).toBe(AIChatQSDataTypeEnum.TASK_NODE_GROUP)
    expect(node?.data.loadingTitle).toBe('')
  })

  it('D3: notify sets message', () => {
    const req = makeHandlerRequest({
      res: makeGrpcJsonRes('notify', { type: 'info', content: 'n1', duration_ms: 0 }),
    })
    aiOtherDataHandlers.notify(req)
    expect(req.store.getState().notifyMessage?.content).toBe('n1')
  })

  it('D3: skip_subtask_in_plan removes matching id', () => {
    const req = makeHandlerRequest({
      res: makeGrpcJsonRes(
        'structured',
        {
          message: 'ok',
          reason: 'user skip',
          subtask_id: 'sub-1',
          subtask_index: '0',
          subtask_name: 'leaf',
          success: true,
        },
        { NodeId: 'skip_subtask_in_plan' },
      ),
    })
    req.store.setState((state) => {
      state.skipSubtaskTaskIDs = ['sub-1', 'sub-2']
    })
    aiOtherDataHandlers.skip_subtask_in_plan(req)
    expect(req.store.getState().skipSubtaskTaskIDs).toEqual(['sub-2'])
  })

  it('D3: skip_subtask_in_plan missing subtask_id logs error', () => {
    const pushLog = vi.fn()
    const req = makeHandlerRequest({
      res: makeGrpcJsonRes('structured', { success: false, subtask_id: '' }, { NodeId: 'skip_subtask_in_plan' }),
      pushLog,
    })
    req.store.setState((state) => {
      state.skipSubtaskTaskIDs = ['sub-keep']
    })
    aiOtherDataHandlers.skip_subtask_in_plan(req)
    expect(pushLog).toHaveBeenCalledWith(expect.objectContaining({ level: 'error' }))
    expect(req.store.getState().skipSubtaskTaskIDs).toEqual(['sub-keep'])
  })
})

describe('aiOther react_task_dequeue schedule fields', () => {
  it('carries schedule trigger metadata into extraValue', () => {
    const req = makeHandlerRequest({
      res: makeGrpcJsonRes(
        'structured',
        {
          react_task_input: '每日巡检 prompt',
          reason: 'normal',
          react_task_user_input_uuid: '',
          queue_len: 0,
          react_task_input_source: 'schedule',
          react_task_schedule_uuid: 'sch-uuid-1',
          react_task_schedule_name: '每日巡检',
          react_task_scheduled_at: '2026-08-27T10:00:00Z',
          react_task_schedule_trigger: 'cron',
        },
        { NodeId: 'react_task_dequeue', TaskId: 'task-schedule-1', IsSync: true },
      ),
    })
    aiOtherDataHandlers.react_task_dequeue(req)

    const node = req.rawData.contents.get('task-schedule-1')
    expect(node?.extraValue).toMatchObject({
      showQS: '每日巡检 prompt',
      inputSource: 'schedule',
      scheduleUUID: 'sch-uuid-1',
      scheduleName: '每日巡检',
      scheduledAt: '2026-08-27T10:00:00Z',
      scheduleTrigger: 'cron',
    })
  })

  it('defaults schedule metadata to empty strings for a regular user question', () => {
    const req = makeHandlerRequest({
      res: makeGrpcJsonRes(
        'structured',
        { react_task_input: '普通提问', reason: 'normal', react_task_user_input_uuid: '', queue_len: 0 },
        { NodeId: 'react_task_dequeue', TaskId: 'task-user-1', IsSync: true },
      ),
    })
    aiOtherDataHandlers.react_task_dequeue(req)

    const node = req.rawData.contents.get('task-user-1')
    expect(node?.extraValue).toMatchObject({
      showQS: '普通提问',
      inputSource: '',
      scheduleUUID: '',
      scheduleName: '',
      scheduledAt: '',
      scheduleTrigger: '',
    })
  })
})

describe('aiOther queue_info current task snapshot', () => {
  it('hydrates a backend-created running task into currentChatStatus', () => {
    const req = makeHandlerRequest({
      res: makeGrpcJsonRes(
        'structured',
        {
          current_task: {
            id: 'scheduled-task-1',
            status: AITaskStatus.inProgress,
            user_input: '每日巡检',
            created_at: '2026-08-28T10:00:00Z',
            focus_mode: 'deep',
            is_recovery: false,
            input_source: 'schedule',
          },
          is_processing: true,
          queue_empty: true,
          queue_name: 'react-main-queue',
          tasks: [],
          total_tasks: 0,
        },
        { NodeId: 'queue_info', IsSync: true },
      ),
    })

    aiOtherDataHandlers.queue_info(req)

    expect(req.store.getState().currentChatStatus).toEqual({
      questionID: 'scheduled-task-1',
      coordinatorId: '',
      status: AITaskStatus.inProgress,
    })
    expect(req.store.getState().currentLoadingTitle.casualTitle).toBe('问题执行中...')
    expect(req.store.getState().focusMode).toBe('deep')
  })

  it('does not let an older snapshot replace a different live running task', () => {
    const req = makeHandlerRequest({
      res: makeGrpcJsonRes(
        'structured',
        {
          current_task: {
            id: 'older-task',
            status: AITaskStatus.inProgress,
            user_input: '旧任务',
            created_at: '2026-08-28T10:00:00Z',
            focus_mode: '',
            is_recovery: false,
          },
          is_processing: true,
          queue_empty: true,
          queue_name: 'react-main-queue',
          tasks: [],
          total_tasks: 0,
        },
        { NodeId: 'queue_info', IsSync: true },
      ),
    })
    req.store.getState().updateCurrentChatStatus({
      questionID: 'live-task',
      coordinatorId: '',
      status: AITaskStatus.inProgress,
    })

    aiOtherDataHandlers.queue_info(req)

    expect(req.store.getState().currentChatStatus.questionID).toBe('live-task')
  })

  it('does not revive a task after a newer terminal event', () => {
    const req = makeHandlerRequest({
      res: makeGrpcJsonRes(
        'structured',
        {
          current_task: {
            id: 'finished-task',
            status: AITaskStatus.inProgress,
            user_input: '已完成任务',
            created_at: '2026-08-28T10:00:00Z',
            focus_mode: '',
            is_recovery: false,
          },
          is_processing: true,
          queue_empty: true,
          queue_name: 'react-main-queue',
          tasks: [],
          total_tasks: 0,
        },
        { NodeId: 'queue_info', IsSync: true },
      ),
    })
    req.store.getState().updateCurrentChatStatus({
      questionID: 'finished-task',
      coordinatorId: '',
      status: AITaskStatus.success,
    })

    aiOtherDataHandlers.queue_info(req)

    expect(req.store.getState().currentChatStatus.status).toBe(AITaskStatus.success)
  })
})

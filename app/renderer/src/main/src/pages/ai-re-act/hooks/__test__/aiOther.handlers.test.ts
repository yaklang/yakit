import { afterEach, describe, it, expect, vi } from 'vitest'
import { aiOtherDataHandlers } from '../grpcStreamHandler/aiOther'
import { DefaultMemoryList } from '../defaultConstant'
import { makeGrpcJsonRes, makeHandlerRequest } from './fixtures'
import { AIChatQSDataTypeEnum, type ChatTaskNodeGroup } from '../aiRender'
import { AINotifyType, AITaskStatus } from '../grpcApi'
import i18n from '@/i18n/i18n'

const tAgent = i18n.getFixedT(null, 'aiAgent')

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
    expect(req.rawData.taskDetailsMap.has('sub-1')).toBe(true)
    expect(req.store.getState().taskDetailsUpdate).toBe(1)
    const node = req.rawData.contents.get('q1-sub-1') as ChatTaskNodeGroup | undefined
    expect(node?.type).toBe(AIChatQSDataTypeEnum.TASK_NODE_GROUP)
    expect(node?.data.loadingTitle).toBe('')
  })

  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
  })

  it.each(['active', 'invalidated', 'closing'])('notify expiration respects a %s connection', (state) => {
    vi.useFakeTimers()
    const req = makeHandlerRequest({
      res: makeGrpcJsonRes('notify', {
        type: AINotifyType.notify429TypeRateLimited,
        content: 'old notice',
        duration_ms: 100,
      }),
    })
    aiOtherDataHandlers.notify(req)
    expect(req.store.getState().notifyMessage?.content).toBe('old notice')
    if (state === 'invalidated') req.meta.lifecycle.current = false
    if (state === 'closing') req.meta.lifecycle.closing = true
    // 新连接或收尾阶段的通知不能被旧定时器清掉。
    req.store.getState().updateState({
      notifyMessage: {
        type: AINotifyType.notify429TypeRateLimited,
        content: 'latest notice',
        label: { Zh: '', En: '' },
      },
    })
    vi.advanceTimersByTime(100)
    expect(req.store.getState().notifyMessage?.content ?? null).toBe(state === 'active' ? null : 'latest notice')
  })

  it('D3: notify sets message', () => {
    const req = makeHandlerRequest({
      res: makeGrpcJsonRes('notify', { type: AINotifyType.notify429TypeRateLimited, content: 'n1', duration_ms: 0 }),
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

describe('notify lifetime', () => {
  afterEach(() => vi.useRealTimers())

  it.each([{ duration_ms: 10 }, { duration_seconds: 1 }, { duration: 1 }])(
    '配额耗尽忽略后端时长 %o，并清除上一条通知的计时器',
    (duration) => {
      vi.useFakeTimers()
      const req = makeHandlerRequest({
        res: makeGrpcJsonRes('notify', {
          type: AINotifyType.notify429TypeRateLimited,
          content: '限流',
          duration_ms: 100,
        }),
      })
      aiOtherDataHandlers.notify(req)
      req.res = makeGrpcJsonRes('notify', {
        type: AINotifyType.notify429TypeQuotaExceeded,
        content: '余额不足',
        ...duration,
      })
      aiOtherDataHandlers.notify(req)
      expect(req.meta.notifyMessageTimer).toBeNull()
      vi.advanceTimersByTime(60_000)
      expect(req.store.getState().notifyMessage?.content).toBe('余额不足')

      req.res = makeGrpcJsonRes('notify', {
        type: AINotifyType.notify429TypeRateLimited,
        content: '新的限流',
        ...duration,
      })
      aiOtherDataHandlers.notify(req)
      expect(req.store.getState().notifyMessage?.content).toBe('新的限流')
      vi.advanceTimersByTime(1000)
      expect(req.store.getState().notifyMessage).toBeNull()
    },
  )
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
    expect(req.store.getState().currentLoadingTitle.casualTitle).toBe(tAgent('AIChatLoading.processingRequest'))
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

describe('aiOther syntaxflow_rule_change', () => {
  it('stores payload and bumps syntaxflowRuleChangeUpdate', () => {
    const payload = { op: 'replace', code: { content: 'rule x {}' } }
    const req = makeHandlerRequest({
      res: makeGrpcJsonRes('syntaxflow_rule_change', payload),
    })
    expect(req.store.getState().syntaxflowRuleChangeUpdate).toBe(0)
    aiOtherDataHandlers.syntaxflow_rule_change(req)
    expect(req.rawData.syntaxflowRuleChange).toEqual(payload)
    expect(req.store.getState().syntaxflowRuleChangeUpdate).toBe(1)
  })

  it('ignores IsSync events', () => {
    const req = makeHandlerRequest({
      res: makeGrpcJsonRes('syntaxflow_rule_change', { op: 'replace', code: { content: 'skip' } }, { IsSync: true }),
    })
    aiOtherDataHandlers.syntaxflow_rule_change(req)
    expect(req.rawData.syntaxflowRuleChange).toBeUndefined()
    expect(req.store.getState().syntaxflowRuleChangeUpdate).toBe(0)
  })
})

const planHistoryTree = JSON.stringify({
  task_id: 'root',
  name: 'root',
  goal: '',
  semantic_identifier: 'root',
  isRemove: false,
  tools: [],
  description: '',
  total_tool_call_count: 0,
  success_tool_call_count: 0,
  fail_tool_call_count: 0,
  summary: '',
  subtasks: [],
})

const planHistoryRecord = (coordinatorId: string, phase: 'Completed' | 'NotCompleted') => ({
  coordinator_id: coordinatorId,
  created_at: '',
  created_at_unix: 0,
  session_id: 'session-1',
  updated_at: '',
  updated_at_unix: 0,
  task_progress: JSON.stringify({
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
  }),
  task_tree: planHistoryTree,
})

describe('aiOther plan_exec_tasks', () => {
  it('过滤已完成规划，协议 total 保持原值，planHistoryCount 为未过滤条数', () => {
    const req = makeHandlerRequest({
      res: makeGrpcJsonRes(
        'structured',
        {
          session_id: 'session-1',
          total: 99,
          records: [
            planHistoryRecord('done-1', 'Completed'),
            planHistoryRecord('open-1', 'NotCompleted'),
            planHistoryRecord('done-2', 'Completed'),
          ],
        },
        { NodeId: 'plan_exec_tasks' },
      ),
    })
    aiOtherDataHandlers.plan_exec_tasks(req)
    const state = req.store.getState()
    expect(state.planHistoryCount).toBe(3)
    const list = state.planHistoryList
    expect(list.total).toBe(99)
    expect(list.session_id).toBe('session-1')
    expect(list.records.map((item) => item.coordinator_id)).toEqual(['open-1'])
    expect(list.records[0].task_progress.phase).toBe('NotCompleted')
    expect(list.records[0].root_task_name).toBe('root')
  })

  it('空 records 保持协议 total，并清空残留的 planHistoryCount', () => {
    const payload = { session_id: 'session-empty', total: 4, records: [] as never[] }
    const req = makeHandlerRequest({
      res: makeGrpcJsonRes('structured', payload, { NodeId: 'plan_exec_tasks' }),
    })
    req.store.getState().updateState({ planHistoryCount: 5 })
    aiOtherDataHandlers.plan_exec_tasks(req)
    expect(req.store.getState().planHistoryList).toEqual(payload)
    expect(req.store.getState().planHistoryCount).toBe(0)
  })
})

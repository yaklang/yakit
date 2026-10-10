import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { aiYakExecResultDataHandlers } from '../grpcStreamHandler/yakExecResult'
import { makeGrpcJsonRes, makeHandlerRequest } from './fixtures'
import { getDefaultAgentLoadingTitle } from '../defaultConstant'
import { AITaskStatus } from '../grpcApi'
import { AIChatQSDataTypeEnum, type ChatTaskNodeGroup } from '../aiRender'
import i18n from '@/i18n/i18n'

describe('yakExecResult handlers', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  const seedTaskNode = (
    req: ReturnType<typeof makeHandlerRequest>,
    questionID: string,
    taskId: string,
    chatType: 'task' | 'reAct' = 'task',
  ) => {
    const nodeId = `${questionID}-${taskId}`
    const node: ChatTaskNodeGroup = {
      id: nodeId,
      type: AIChatQSDataTypeEnum.TASK_NODE_GROUP,
      chatType,
      Timestamp: 1,
      AIService: '',
      AIModelName: '',
      data: {
        taskId,
        taskName: 'sub',
        goal: '',
        status: AITaskStatus.inProgress,
        loadingTitle: '',
      },
    }
    req.rawData.contents.set(nodeId, node)
    req.store.getState().updateCurrentChatStatus({
      questionID,
      status: AITaskStatus.inProgress,
      coordinatorId: '',
    })
    req.store.getState().dispatchStreamingNode({
      chatType,
      node: { token: nodeId, kind: 'task', type: AIChatQSDataTypeEnum.TASK_NODE_GROUP },
    })
    return nodeId
  }

  it('D10: status updates casualTitle for reAct', () => {
    const req = makeHandlerRequest({
      res: makeGrpcJsonRes(
        'structured',
        { key: 're-act-loading-status-key', value: 'working' },
        { NodeId: 'status', TaskId: 'q1' },
      ),
      chatType: 'reAct',
    })
    req.store.getState().updateCurrentChatStatus({
      questionID: 'q1',
      status: AITaskStatus.inProgress,
      coordinatorId: '',
    })
    aiYakExecResultDataHandlers.status(req)
    expect(req.store.getState().currentLoadingTitle.casualTitle).toBe('working')
  })

  it('D10: status skips re-act-loading-status-key without currentChatID', () => {
    const req = makeHandlerRequest({
      res: makeGrpcJsonRes(
        'structured',
        { key: 're-act-loading-status-key', value: 'running-task' },
        { NodeId: 'status', TaskId: 'sub-1' },
      ),
      chatType: 'task',
    })
    aiYakExecResultDataHandlers.status(req)
    expect(req.store.getState().currentLoadingTitle.casualTitle).toBe(getDefaultAgentLoadingTitle().casualTitle)
    expect(req.store.getState().currentLoadingTitle.planTitle).toBe('')
  })

  it('D10: status updates TASK_NODE_GROUP loadingTitle for task sub-node', () => {
    const req = makeHandlerRequest({
      res: makeGrpcJsonRes(
        'structured',
        { key: 're-act-loading-status-key', value: 'running-task' },
        { NodeId: 'status', TaskId: 'sub-1' },
      ),
      chatType: 'task',
    })
    const nodeId = seedTaskNode(req, 'q1', 'sub-1', 'task')
    const prevNum = req.store.getState().tasks[nodeId].renderNum
    aiYakExecResultDataHandlers.status(req)
    const node = req.rawData.contents.get(nodeId) as ChatTaskNodeGroup
    expect(node.data.loadingTitle).toBe('running-task')
    expect(req.store.getState().tasks[nodeId].renderNum).toBe(prevNum + 1)
  })

  it('D10: status updates TASK_NODE_GROUP loadingTitle for reAct sub-task', () => {
    const req = makeHandlerRequest({
      res: makeGrpcJsonRes(
        'structured',
        { key: 're-act-loading-status-key', value: 'sub-working' },
        { NodeId: 'status', TaskId: 'sub-2' },
      ),
      chatType: 'reAct',
    })
    const nodeId = seedTaskNode(req, 'q1', 'sub-2', 'reAct')
    aiYakExecResultDataHandlers.status(req)
    const node = req.rawData.contents.get(nodeId) as ChatTaskNodeGroup
    expect(node.data.loadingTitle).toBe('sub-working')
    expect(req.store.getState().currentLoadingTitle.casualTitle).toBe(getDefaultAgentLoadingTitle().casualTitle)
  })

  it('D10: status uses default TASK_NODE_GROUP loadingTitle when value is empty', () => {
    const req = makeHandlerRequest({
      res: makeGrpcJsonRes(
        'structured',
        { key: 're-act-loading-status-key', value: '' },
        { NodeId: 'status', TaskId: 'sub-3' },
      ),
      chatType: 'task',
    })
    const nodeId = seedTaskNode(req, 'q1', 'sub-3', 'task')
    aiYakExecResultDataHandlers.status(req)
    const node = req.rawData.contents.get(nodeId) as ChatTaskNodeGroup
    expect(node.data.loadingTitle).toBe('加载中...')
  })

  it('D10: status updates plan title for task', () => {
    const req = makeHandlerRequest({
      res: makeGrpcJsonRes(
        'structured',
        { key: 'plan-executing-loading-status-key', value: 'planning' },
        { NodeId: 'status' },
      ),
      chatType: 'task',
    })
    aiYakExecResultDataHandlers.status(req)
    expect(req.store.getState().currentLoadingTitle.planTitle).toBe('planning')
  })

  it.each(['zh', 'zh-TW', 'en'])('selects translated loading status for %s', (language) => {
    const previous = i18n.resolvedLanguage
    i18n.resolvedLanguage = language
    try {
      const req = makeHandlerRequest({
        res: makeGrpcJsonRes(
          'structured',
          {
            key: 're-act-loading-status-key',
            value: '旧版文案',
            value_i18n: { zh: '正在调用读取文件', en: 'Calling Read file' },
          },
          { NodeId: 'status', TaskId: 'q1' },
        ),
      })
      seedTaskNode(req, 'q1', 'sub')
      aiYakExecResultDataHandlers.status(req)
      expect(req.store.getState().currentLoadingTitle.casualTitle).toBe(
        language === 'en' ? 'Calling Read file' : '正在调用读取文件',
      )
    } finally {
      i18n.resolvedLanguage = previous
    }
  })

  it('late statuses cannot replace newer task activity; equal timestamps retain stream order', () => {
    const req = makeHandlerRequest({
      res: makeGrpcJsonRes(
        'structured',
        { key: 're-act-loading-status-key', value: '正在调用读取文件' },
        { NodeId: 'status', TaskId: 'q1', Timestamp: 20 },
      ),
    })
    seedTaskNode(req, 'q1', 'sub')
    aiYakExecResultDataHandlers.status(req)
    req.res = makeGrpcJsonRes(
      'structured',
      { key: 're-act-loading-status-key', value: '等待回复' },
      { NodeId: 'status', TaskId: 'q1', CoordinatorId: 'previous-response', Timestamp: 19 },
    )
    aiYakExecResultDataHandlers.status(req)
    expect(req.store.getState().currentLoadingTitle.casualTitle).toBe('正在调用读取文件')
    req.res = makeGrpcJsonRes(
      'structured',
      { key: 're-act-loading-status-key', value: '正在生成回复正文' },
      { NodeId: 'status', TaskId: 'q1', Timestamp: 20 },
    )
    aiYakExecResultDataHandlers.status(req)
    expect(req.store.getState().currentLoadingTitle.casualTitle).toBe('正在生成回复正文')
  })

  it('interleaved tasks keep independent loading-status timestamps', () => {
    const req = makeHandlerRequest({ chatType: 'task', res: makeGrpcJsonRes('structured', {}) })
    const firstId = seedTaskNode(req, 'q1', 'sub-1')
    const secondId = seedTaskNode(req, 'q1', 'sub-2')
    const firstNode = req.rawData.contents.get(firstId) as ChatTaskNodeGroup
    const secondNode = req.rawData.contents.get(secondId) as ChatTaskNodeGroup

    const events = [
      ['sub-1', 20, 'first working', 'first working', ''],
      ['sub-2', 10, 'second working', 'first working', 'second working'],
      ['sub-1', 19, 'first stale', 'first working', 'second working'],
      ['sub-2', 11, 'second updated', 'first working', 'second updated'],
      ['sub-1', 21, 'first updated', 'first updated', 'second updated'],
      ['sub-2', 10, 'second stale', 'first updated', 'second updated'],
    ] as const
    for (const [taskId, timestamp, value, firstTitle, secondTitle] of events) {
      req.res = makeGrpcJsonRes(
        'structured',
        { key: 're-act-loading-status-key', value },
        { NodeId: 'status', TaskId: taskId, Timestamp: timestamp },
      )
      aiYakExecResultDataHandlers.status(req)
      expect(firstNode.data.loadingTitle).toBe(firstTitle)
      expect(secondNode.data.loadingTitle).toBe(secondTitle)
    }
  })

  it('interleaved status keys for one task keep independent timestamps', () => {
    const req = makeHandlerRequest({ chatType: 'task', res: makeGrpcJsonRes('structured', {}) })
    const nodeId = seedTaskNode(req, 'q1', 'sub')
    const node = req.rawData.contents.get(nodeId) as ChatTaskNodeGroup

    const events = [
      ['re-act-loading-status-key', 20, 'tool working', 'tool working', ''],
      ['plan-executing-loading-status-key', 10, 'planning', 'tool working', 'planning'],
      ['re-act-loading-status-key', 19, 'tool stale', 'tool working', 'planning'],
      ['plan-executing-loading-status-key', 11, 'plan updated', 'tool working', 'plan updated'],
      ['re-act-loading-status-key', 21, 'tool updated', 'tool updated', 'plan updated'],
      ['plan-executing-loading-status-key', 10, 'plan stale', 'tool updated', 'plan updated'],
    ] as const
    for (const [key, timestamp, value, loadingTitle, planTitle] of events) {
      req.res = makeGrpcJsonRes('structured', { key, value }, { NodeId: 'status', TaskId: 'sub', Timestamp: timestamp })
      aiYakExecResultDataHandlers.status(req)
      expect(node.data.loadingTitle).toBe(loadingTitle)
      expect(req.store.getState().currentLoadingTitle.planTitle).toBe(planTitle)
    }
  })

  it('repeated sub-task statuses do not trigger another render', () => {
    const req = makeHandlerRequest({
      res: makeGrpcJsonRes(
        'structured',
        { key: 're-act-loading-status-key', value: '读取文件' },
        { NodeId: 'status', TaskId: 'sub', Timestamp: 20 },
      ),
      chatType: 'task',
    })
    const nodeId = seedTaskNode(req, 'q1', 'sub', 'task')
    aiYakExecResultDataHandlers.status(req)
    const renderNum = req.store.getState().tasks[nodeId].renderNum
    aiYakExecResultDataHandlers.status(req)
    expect(req.store.getState().tasks[nodeId].renderNum).toBe(renderNum)
  })

  it.each([
    ['status', 'active'],
    ['status', 'invalidated'],
    ['status', 'closing'],
    ['yak_exec_result', 'active'],
    ['yak_exec_result', 'invalidated'],
    ['yak_exec_result', 'closing'],
  ] as const)('delayed %s cards respect a %s connection', (event, state) => {
    const log = {
      type: 'log',
      content: {
        level: 'feature-status-card-data',
        timestamp: 1,
        data: JSON.stringify({ id: 'progress', data: '42', tags: [] }),
      },
    }
    const res =
      event === 'status'
        ? makeGrpcJsonRes('structured', { key: 'progress', value: '42' }, { NodeId: 'status' })
        : makeGrpcJsonRes('yak_exec_result', {
            IsMessage: true,
            Message: Buffer.from(JSON.stringify(log)).toString('base64'),
          })
    const req = makeHandlerRequest({ res })
    aiYakExecResultDataHandlers[event](req)
    expect(req.store.getState().card).toEqual([])
    if (state === 'invalidated') req.meta.lifecycle.current = false
    if (state === 'closing') req.meta.lifecycle.closing = true
    vi.advanceTimersByTime(500)
    if (state === 'active') expect(req.store.getState().card).toHaveLength(1)
    else expect(req.store.getState().card).toEqual([])
  })

  it('D10: yak_exec_result registered', () => {
    expect(typeof aiYakExecResultDataHandlers.yak_exec_result).toBe('function')
  })
})

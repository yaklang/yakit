import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { aiYakExecResultDataHandlers } from '../grpcStreamHandler/yakExecResult'
import { makeGrpcJsonRes, makeHandlerRequest } from './fixtures'
import { getDefaultAgentLoadingTitle } from '../defaultConstant'
import { AITaskStatus } from '../grpcApi'
import { AIChatQSDataTypeEnum, type ChatTaskNodeGroup } from '../aiRender'

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

  it('D10: yak_exec_result registered', () => {
    expect(typeof aiYakExecResultDataHandlers.yak_exec_result).toBe('function')
  })
})

import { describe, expect, it, vi } from 'vitest'
import { aiOtherDataHandlers } from '../grpcStreamHandler/aiOther'
import { aiSingleItemDataHandlers } from '../grpcStreamHandler/aiSingleItem'
import { AIChatQSDataTypeEnum } from '../aiRender'
import type { ChatTaskNodeGroup } from '../aiRender'
import { AIInputEventSyncTypeEnum, AITaskStatus } from '../grpcApi'
import { makeGrpcJsonRes, makeHandlerRequest } from './fixtures'

vi.mock('../persist/contentPersistHelper', () => ({
  persistIndependentItem: vi.fn(),
  persistToolResultIfTerminal: vi.fn(),
  deletePersistedContent: vi.fn(),
}))

const createAgent = (chatType: 'reAct' | 'task', isSubAgent = true, isSync = false) => {
  const req = makeHandlerRequest({
    chatType,
    res: makeGrpcJsonRes(
      'structured',
      {
        react_task_id: 'child',
        react_task_status: AITaskStatus.inProgress,
        react_task_is_sub_agent: isSubAgent,
      },
      { NodeId: 'react_task_created', Timestamp: 10, IsSync: isSync },
    ),
  })
  req.store.getState().updateCurrentChatStatus({ questionID: 'q1' })
  aiOtherDataHandlers.react_task_created(req)
  return req
}

describe('async task lifecycle events', () => {
  it('creates a reAct sub Agent and updates its status without completing the parent', () => {
    const req = createAgent('reAct')
    const child = req.rawData.contents.get('q1-child') as ChatTaskNodeGroup
    expect(child).toMatchObject({
      chatType: 'reAct',
      type: AIChatQSDataTypeEnum.TASK_NODE_GROUP,
      data: { taskId: 'child', status: AITaskStatus.inProgress, loadingTitle: '' },
    })
    req.store.getState().updateCurrentChatStatus({ status: AITaskStatus.inProgress })
    req.res = makeGrpcJsonRes(
      'structured',
      {
        react_task_id: 'child',
        react_task_now_status: 'completed',
      },
      { NodeId: 'react_task_status_changed', Timestamp: 20 },
    )
    aiOtherDataHandlers.react_task_status_changed(req)
    expect(child.data.status).toBe('completed')
    expect(req.store.getState().currentChatStatus.status).toBe(AITaskStatus.inProgress)
  })

  it('ignores task-channel Agent creation and status changes', () => {
    const taskReq = createAgent('task')
    expect(taskReq.rawData.contents.size).toBe(0)
    expect(taskReq.store.getState().chatElements).toHaveLength(0)
    expect(taskReq.meta.casualSubTaskIDs.size).toBe(0)

    const req = createAgent('reAct')
    const child = req.rawData.contents.get('q1-child') as ChatTaskNodeGroup
    req.chatType = 'task'
    req.res = makeGrpcJsonRes(
      'structured',
      {
        react_task_id: 'nested',
        react_task_is_sub_agent: true,
        react_task_status: AITaskStatus.inProgress,
      },
      { NodeId: 'react_task_created', TaskId: 'child', Timestamp: 12 },
    )
    aiOtherDataHandlers.react_task_created(req)
    expect(req.rawData.contents.has('q1-nested')).toBe(false)
    req.res = makeGrpcJsonRes(
      'structured',
      {
        react_task_id: 'child',
        react_task_now_status: 'completed',
      },
      { NodeId: 'react_task_status_changed', Timestamp: 20 },
    )
    aiOtherDataHandlers.react_task_status_changed(req)
    expect(child.data.status).toBe(AITaskStatus.inProgress)
  })

  it('ignores root tasks and synchronized creation', () => {
    expect(createAgent('reAct', false).rawData.contents.size).toBe(0)
    expect(createAgent('reAct', true, true).rawData.contents.size).toBe(0)
  })

  it('does not duplicate a reAct Agent when its creation event is repeated', () => {
    const req = createAgent('reAct')
    const child = req.rawData.contents.get('q1-child')
    aiOtherDataHandlers.react_task_created(req)
    expect(req.rawData.contents.size).toBe(1)
    expect(req.rawData.contents.get('q1-child')).toBe(child)
    expect(req.store.getState().chatElements).toHaveLength(1)
    expect([...req.meta.casualSubTaskIDs]).toEqual(['child'])
  })

  it('updates local Agent status before notifying subscribers and ignores replayed updates', () => {
    const req = createAgent('reAct')
    const child = req.rawData.contents.get('q1-child') as ChatTaskNodeGroup
    req.res = makeGrpcJsonRes(
      'structured',
      {
        react_task_id: 'child',
        react_task_now_status: 'completed',
      },
      { NodeId: 'react_task_status_changed', Timestamp: 20, IsSync: true },
    )
    aiOtherDataHandlers.react_task_status_changed(req)
    expect(child.data.status).toBe(AITaskStatus.inProgress)
    const statusesOnUpdate: string[] = []
    const unsubscribe = req.store.subscribe(() => {
      statusesOnUpdate.push(child.data.status ?? '')
    })
    req.res = { ...req.res, IsSync: false }
    aiOtherDataHandlers.react_task_status_changed(req)
    unsubscribe()
    expect(statusesOnUpdate).toEqual(['completed'])
  })

  it('tracks an active plan node until pop_task completes it and requests a plan sync', () => {
    const sendRequest = vi.fn()
    const req = makeHandlerRequest({ chatType: 'task', res: makeGrpcJsonRes('structured', {}), sendRequest })
    req.store.getState().updateCurrentChatStatus({ questionID: 'q1' })
    const event = (type: 'push_task' | 'pop_task', time: number) => {
      req.res = makeGrpcJsonRes(
        'structured',
        {
          type,
          task: {
            task_id: 'leaf',
            name: 'leaf',
            goal: '',
            task_status: type === 'pop_task' ? 'completed' : 'processing',
          },
        },
        { NodeId: 'system', Timestamp: time },
      )
      aiSingleItemDataHandlers[type](req)
    }
    event('push_task', 10)
    const node = req.rawData.contents.get('q1-leaf') as ChatTaskNodeGroup
    expect(node).toMatchObject({
      chatType: 'task',
      type: AIChatQSDataTypeEnum.TASK_NODE_GROUP,
      data: { taskId: 'leaf', taskName: 'leaf', status: AITaskStatus.inProgress, loadingTitle: '' },
    })
    expect(req.meta.currentTaskPlanActiveNode.has(node.id)).toBe(true)
    expect(sendRequest).not.toHaveBeenCalled()

    event('push_task', 10)
    expect(req.rawData.contents.get(node.id)).toBe(node)
    expect(
      [...req.rawData.contents.values()].filter((item) => item.type === AIChatQSDataTypeEnum.TASK_NODE_GROUP),
    ).toHaveLength(1)
    expect(req.store.getState().chatElements).toHaveLength(1)

    event('pop_task', 20)
    expect(node.data.status).toBe('completed')
    expect(req.meta.currentTaskPlanActiveNode.has(node.id)).toBe(false)
    expect(sendRequest).toHaveBeenCalledExactlyOnceWith({
      IsSyncMessage: true,
      SyncType: AIInputEventSyncTypeEnum.SYNC_TYPE_PLAN,
    })
  })
})

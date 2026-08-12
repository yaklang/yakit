import { describe, it, expect, beforeEach } from 'vitest'
import { AITaskStatus } from '../grpcApi'
import { trySettleTaskPlanEnd, handleTaskPlanEnd } from '../utils'
import { DefaultTaskPlanEndGate } from '../defaultConstant'
import { createTestSession } from './fixtures'
import { AIChatQSDataTypeEnum } from '../aiRender'

describe('trySettleTaskPlanEnd / handleTaskPlanEnd', () => {
  beforeEach(() => {
    // no-op
  })

  it('B1: missing end keeps status unchanged', () => {
    const { store, meta } = createTestSession()
    store.getState().updateState({
      currentChatStatus: {
        questionID: 't1',
        status: AITaskStatus.inProgress,
        coordinatorId: 'c1',
      },
      cancelTaskLoading: true,
    })
    meta.taskPlanEndGate = { endReceived: false, pendingStatus: 'completed' }
    trySettleTaskPlanEnd(store, meta)
    expect(store.getState().currentChatStatus.status).toBe(AITaskStatus.inProgress)
    expect(store.getState().cancelTaskLoading).toBe(true)
    expect(meta.taskPlanEndGate.pendingStatus).toBe('completed')
  })

  it('B1: missing pending keeps status unchanged', () => {
    const { store, meta } = createTestSession()
    store.getState().updateState({
      currentChatStatus: {
        questionID: 't1',
        status: AITaskStatus.inProgress,
        coordinatorId: 'c1',
      },
    })
    meta.taskPlanEndGate = { endReceived: true, pendingStatus: undefined }
    trySettleTaskPlanEnd(store, meta)
    expect(store.getState().currentChatStatus.status).toBe(AITaskStatus.inProgress)
  })

  it('B1: both sides settle status and reset gate', () => {
    const { store, meta } = createTestSession()
    store.getState().updateState({
      currentChatStatus: {
        questionID: 't1',
        status: AITaskStatus.inProgress,
        coordinatorId: 'c1',
      },
      cancelTaskLoading: true,
    })
    meta.taskPlanEndGate = { endReceived: true, pendingStatus: 'completed' }
    trySettleTaskPlanEnd(store, meta)
    expect(store.getState().currentChatStatus.status).toBe('completed')
    expect(store.getState().cancelTaskLoading).toBe(false)
    expect(meta.taskPlanEndGate).toEqual(DefaultTaskPlanEndGate)
  })

  it('B2: handleTaskPlanEnd sets endReceived and settles when pending exists', () => {
    const session = createTestSession()
    session.store.getState().updateState({
      currentChatStatus: {
        questionID: 't1',
        status: AITaskStatus.inProgress,
        coordinatorId: 'c1',
      },
    })
    session.meta.taskPlanEndGate = { endReceived: false, pendingStatus: 'aborted' }
    handleTaskPlanEnd(session)
    expect(session.store.getState().currentLoadingTitle.planTitle).toBe('已结束')
    expect(session.store.getState().currentLoadingTitle.taskTitle).toBe('已结束')
    expect(session.store.getState().currentChatStatus.questionID).toBe('t1')
    expect(session.store.getState().currentChatStatus.status).toBe('aborted')
    expect(session.meta.taskPlanEndGate).toEqual(DefaultTaskPlanEndGate)
  })

  it('B2: isChatEnd resets gate without settling', () => {
    const session = createTestSession()
    session.store.getState().updateState({
      currentChatStatus: {
        questionID: 't1',
        status: AITaskStatus.inProgress,
        coordinatorId: 'c1',
      },
    })
    session.meta.taskPlanEndGate = { endReceived: true, pendingStatus: 'completed' }
    handleTaskPlanEnd(session, true)
    expect(session.store.getState().currentChatStatus.status).toBe(AITaskStatus.inProgress)
    expect(session.meta.taskPlanEndGate).toEqual(DefaultTaskPlanEndGate)
  })

  it('B2: marks active TASK_NODE_GROUP as error', () => {
    const session = createTestSession()
    const nodeId = 'plan-task-1'
    session.meta.currentTaskPlanActiveNode.add(nodeId)
    session.rawData.contents.set(nodeId, {
      id: nodeId,
      type: AIChatQSDataTypeEnum.TASK_NODE_GROUP,
      chatType: 'task',
      Timestamp: 1,
      AIService: '',
      AIModelName: '',
      data: { status: AITaskStatus.inProgress },
    } as any)
    session.store.getState().updatePlanTree({
      root_task_name: 'root',
      task_tree: [{ task_id: 'a', progress: AITaskStatus.inProgress } as any],
    })
    handleTaskPlanEnd(session)
    const node = session.rawData.contents.get(nodeId) as any
    expect(node.data.status).toBe(AITaskStatus.error)
    expect(session.store.getState().taskChat.plan.task_tree[0].progress).toBe(AITaskStatus.error)
    expect(session.meta.currentTaskPlanActiveNode.size).toBe(0)
  })
})

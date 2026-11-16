import { describe, it, expect, beforeEach, vi } from 'vitest'
import { AITaskStatus } from '../grpcApi'
import { trySettleTaskPlanEnd, handleTaskPlanEnd } from '../utils'
import { DefaultTaskPlanEndGate } from '../defaultConstant'
import { createTestSession } from './fixtures'
import { persistIndependentItem } from '../persist/contentPersistHelper'
import { mergeSubForgeRun, type SubForgeRun } from '../subForgeTaskTree'
import { AIChatQSDataTypeEnum } from '../aiRender'

vi.mock('../persist/contentPersistHelper', () => ({ persistIndependentItem: vi.fn() }))

describe('trySettleTaskPlanEnd / handleTaskPlanEnd', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it.each([false, true])('freezes unfinished children across same-coordinator recovery (chat end: %s)', (isChatEnd) => {
    const session = createTestSession()
    const { store } = session
    const running: SubForgeRun = {
      parent_coordinator_id: 'parent',
      parent_task_id: 'task',
      parent_task_uuid: 'attempt',
      call_tool_id: 'call',
      child_coordinator_id: 'old-child',
      tool_name: 'inventory',
      revision: 3,
      status: 'running',
      historical: false,
      task_tree: null,
    }
    const completed: SubForgeRun = { ...running, child_coordinator_id: 'done-child', status: 'succeeded' }
    store.getState().updateCurrentChatStatus({ coordinatorId: 'parent', status: AITaskStatus.inProgress })
    store.getState().updateState({ subForgeRuns: { 'old-child': running, 'done-child': completed } })
    handleTaskPlanEnd(session, isChatEnd)
    const frozen = store.getState().subForgeRuns['old-child']
    expect(frozen).toEqual({ ...running, historical: true })
    expect(store.getState().subForgeRuns['done-child']).toBe(completed)
    store.getState().updateCurrentChatStatus({ coordinatorId: 'parent', status: AITaskStatus.inProgress })
    expect(mergeSubForgeRun(frozen, running, true).historical).toBe(true)
    const newCall = { ...running, child_coordinator_id: 'new-child', call_tool_id: 'new-call' }
    expect(mergeSubForgeRun(undefined, newCall, false).historical).toBe(false)
    expect(mergeSubForgeRun(frozen, { ...running, revision: 4, status: 'cancelled' }, true).status).toBe('cancelled')
  })
  it('B1: missing end keeps status unchanged', () => {
    const { store, meta } = createTestSession()
    store.getState().updateState({
      currentChatStatus: {
        questionID: 't1',
        status: AITaskStatus.inProgress,
        coordinatorId: 'c1',
      },
      cancelChatLoading: true,
    })
    meta.taskPlanEndGate = { endReceived: false, pendingStatus: 'completed' }
    trySettleTaskPlanEnd(store, meta)
    expect(store.getState().currentChatStatus.status).toBe(AITaskStatus.inProgress)
    expect(store.getState().cancelChatLoading).toBe(true)
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
      cancelChatLoading: true,
    })
    meta.taskPlanEndGate = { endReceived: true, pendingStatus: 'completed' }
    trySettleTaskPlanEnd(store, meta)
    expect(store.getState().currentChatStatus.status).toBe('completed')
    expect(store.getState().cancelChatLoading).toBe(false)
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
      data: { status: AITaskStatus.inProgress, loadingTitle: '' },
    } as any)
    session.store.getState().updateState({
      currentPlan: {
        root_task_name: 'root',
        task_tree: [{ task_id: 'a', progress: AITaskStatus.inProgress } as any],
      },
    })
    handleTaskPlanEnd(session)
    const node = session.rawData.contents.get(nodeId) as any
    expect(node.data.status).toBe(AITaskStatus.error)
    expect(persistIndependentItem).toHaveBeenCalledWith(session.sessionId, node, session.meta.lifecycle)
    expect(session.store.getState().currentPlan.task_tree[0].progress).toBe(AITaskStatus.error)
    expect(session.meta.currentTaskPlanActiveNode.size).toBe(0)
  })
})

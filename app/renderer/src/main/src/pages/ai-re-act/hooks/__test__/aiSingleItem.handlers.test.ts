import { describe, it, expect, vi } from 'vitest'
import { aiSingleItemDataHandlers } from '../grpcStreamHandler/aiSingleItem'
import { makeGrpcJsonRes, makeHandlerRequest } from './fixtures'
import { AIChatQSDataTypeEnum, type ChatTaskNodeGroup } from '../aiRender'
import { AITaskStatus } from '../grpcApi'

vi.mock('../persist/contentPersistHelper', () => ({
  persistIndependentItem: vi.fn(),
}))

describe('aiSingleItem handlers', () => {
  it('D5: thought inserts content and tree node', () => {
    const req = makeHandlerRequest({
      res: makeGrpcJsonRes('thought', { thought: 'thinking...' }),
    })
    aiSingleItemDataHandlers.thought(req)
    const thoughts = [...req.rawData.contents.values()].filter((c) => c.type === AIChatQSDataTypeEnum.THOUGHT)
    expect(thoughts).toHaveLength(1)
    expect(req.store.getState().casualChat.elements.length).toBeGreaterThan(0)
  })

  it('D5: result inserts when not after_stream', () => {
    const req = makeHandlerRequest({
      res: makeGrpcJsonRes('result', { result: 'ok', after_stream: false }),
    })
    aiSingleItemDataHandlers.result(req)
    const results = [...req.rawData.contents.values()].filter((c) => c.type === AIChatQSDataTypeEnum.RESULT)
    expect(results.length).toBeGreaterThan(0)
  })

  it('D5: push_task creates TASK_NODE_GROUP with empty loadingTitle', () => {
    const req = makeHandlerRequest({
      res: makeGrpcJsonRes(
        'structured',
        {
          type: 'push_task',
          task: { name: 'leaf', goal: 'do it', task_id: 'leaf-1', task_status: AITaskStatus.inProgress },
        },
        { NodeId: 'system' },
      ),
      chatType: 'task',
    })
    req.store.getState().updateCurrentChatStatus({
      questionID: 'q1',
      status: AITaskStatus.inProgress,
      coordinatorId: 'c1',
    })
    aiSingleItemDataHandlers.push_task(req)
    const node = req.rawData.contents.get('q1-leaf-1') as ChatTaskNodeGroup | undefined
    expect(node?.type).toBe(AIChatQSDataTypeEnum.TASK_NODE_GROUP)
    expect(node?.data.loadingTitle).toBe('')
  })

  it('D5: map registers push/pop/fail handlers', () => {
    for (const key of [
      'fail_react_task',
      'tool_call_decision',
      'fail_plan_and_execution',
      'ai_call_failure',
      'push_task',
      'pop_task',
      'report-finish',
    ] as const) {
      expect(typeof aiSingleItemDataHandlers[key]).toBe('function')
    }
  })
})

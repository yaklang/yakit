import { describe, it, expect, vi } from 'vitest'
import { aiSingleItemDataHandlers } from '../grpcStreamHandler/aiSingleItem'
import { makeGrpcJsonRes, makeHandlerRequest } from './fixtures'
import { AIChatQSDataTypeEnum, type ChatTaskNodeGroup } from '../aiRender'
import { persistIndependentItem } from '../persist/contentPersistHelper'
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
    expect(persistIndependentItem).toHaveBeenLastCalledWith(req.sessionId, thoughts[0], req.meta.lifecycle)
    expect(req.store.getState().chatElements.length).toBeGreaterThan(0)
  })

  it.each([
    { state: 'registered', route: 'native', model: 'main' },
    { state: 'read', route: 'unknown', model: 'main' },
    { state: 'read', route: 'native' },
    { state: 'read', route: 'vision', model: ' ' },
    { state: 'read', route: 'native', model: { name: 'main' } },
  ])('ignores invalid image reader events %j', (data) => {
    const req = makeHandlerRequest({ res: makeGrpcJsonRes('structured', data) })
    const dispatch = vi.spyOn(req.store.getState(), 'dispatchStreamingNode')
    vi.mocked(persistIndependentItem).mockClear()
    aiSingleItemDataHandlers.image_context(req)
    expect(req.rawData.contents.size).toBe(0)
    expect(dispatch).not.toHaveBeenCalled()
    expect(persistIndependentItem).not.toHaveBeenCalled()
  })

  it.each([
    { route: 'native', count: '3', expected: 3 },
    { route: 'vision', count: 2, expected: 2 },
    { route: 'vision', count: undefined, expected: 1 },
    { route: 'vision', count: -1, expected: 1 },
    { route: 'native', count: 0, expected: 1 },
    { route: 'native', count: 'Infinity', expected: 1 },
    { route: 'native', count: 1.5, expected: 1 },
  ])('persists and dispatches $route image reads for count $count', ({ route, count, expected }) => {
    const req = makeHandlerRequest({
      res: makeGrpcJsonRes(
        'structured',
        { state: 'read', route, model: ' reader ', image_count: count },
        { IsSync: true },
      ),
    })
    const dispatch = vi.spyOn(req.store.getState(), 'dispatchStreamingNode')
    vi.mocked(persistIndependentItem).mockClear()
    aiSingleItemDataHandlers.image_context(req)
    const [item] = [...req.rawData.contents.values()]
    expect(item).toMatchObject({
      type: AIChatQSDataTypeEnum.IMAGE_MODEL_READ,
      data: { route, model: 'reader', imageCount: expected },
    })
    expect(persistIndependentItem).toHaveBeenCalledExactlyOnceWith(req.sessionId, item, req.meta.lifecycle)
    expect(dispatch).toHaveBeenCalledExactlyOnceWith({
      chatType: req.chatType,
      parentTaskId: item.TaskId,
      node: { token: item.id, kind: 'item', type: item.type, isHistory: true },
    })
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
    expect(persistIndependentItem).toHaveBeenLastCalledWith(req.sessionId, node, req.meta.lifecycle)
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

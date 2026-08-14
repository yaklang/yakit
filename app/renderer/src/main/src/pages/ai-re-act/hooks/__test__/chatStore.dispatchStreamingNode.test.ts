import { describe, it, expect } from 'vitest'
import { createChatStore } from '../chatStore'
import { AIChatQSDataTypeEnum } from '../aiRender'

describe('dispatchStreamingNode', () => {
  it('C3: appends item and mounts under task', () => {
    const store = createChatStore()
    store.getState().dispatchStreamingNode({
      chatType: 'task',
      node: { token: 'task-1', kind: 'task', type: AIChatQSDataTypeEnum.TASK_NODE_GROUP },
    })
    expect(store.getState().tasks['task-1']).toBeTruthy()
    // 任务规划和自由对话数据已合并到 chatElements
    expect(store.getState().chatElements.some((e) => e.token === 'task-1')).toBe(true)

    store.getState().dispatchStreamingNode({
      chatType: 'task',
      parentTaskId: 'task-1',
      node: { token: 'child-1', kind: 'item', type: 'thought' },
    })
    expect(store.getState().tasks['task-1'].childrenTokens).toContain('child-1')
    expect(store.getState().items['child-1']).toBeTruthy()

    // idempotent
    store.getState().dispatchStreamingNode({
      chatType: 'task',
      parentTaskId: 'task-1',
      node: { token: 'child-1', kind: 'item', type: 'thought' },
    })
    expect(store.getState().tasks['task-1'].childrenTokens.filter((t) => t === 'child-1')).toHaveLength(1)
  })

  it('C3: history prepends', () => {
    const store = createChatStore()
    store.getState().dispatchStreamingNode({
      chatType: 'reAct',
      node: { token: 'a', kind: 'item', type: 'thought' },
    })
    store.getState().dispatchStreamingNode({
      chatType: 'reAct',
      node: { token: 'b', kind: 'item', type: 'thought', isHistory: true },
    })
    expect(store.getState().chatElements.map((e) => e.token)).toEqual(['b', 'a'])
  })
})

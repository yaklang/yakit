import './setupElectron'
import { describe, it, expect } from 'vitest'
import { getAIItemKind } from '../useAIItemKind'

describe('getAIItemKind', () => {
  it('B13: resolves item/group/task/null', () => {
    const state = {
      items: { i1: { kind: 'item', token: 'i1', type: 'thought', renderNum: 0, nodeId: '' } as any },
      groups: { g1: { kind: 'group', token: 'g1', type: 'stream', renderNum: 0, childrenTokens: [] } as any },
      tasks: { t1: { kind: 'task', token: 't1', type: 'task_node_group', renderNum: 0, childrenTokens: [] } as any },
    }
    expect(getAIItemKind(state, 'i1')).toBe('item')
    expect(getAIItemKind(state, 'g1')).toBe('group')
    expect(getAIItemKind(state, 't1')).toBe('task')
    expect(getAIItemKind(state, 'missing')).toBeNull()
  })
})

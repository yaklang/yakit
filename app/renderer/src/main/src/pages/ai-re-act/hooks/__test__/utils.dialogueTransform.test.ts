import { describe, it, expect } from 'vitest'
import {
  indexedDBDataToReActChatRenderItem as toReActChatItems,
  getTreeDataIds,
  toDialogueData,
} from '../utils'
import type { DialogueRecord } from '@/pages/ai-agent/store/type'

describe('dialogue transform helpers', () => {
  it('B9: indexedDBDataToReActChatRenderItem', () => {
    const data: DialogueRecord[] = [
      {
        token: 'g1',
        type: 'stream',
        kind: 'group',
        isGroup: true,
        children: JSON.stringify([{ token: 'c1' }]),
        sessionId: 's',
        cacheOrder: 0,
      } as any,
      {
        token: 'i1',
        type: 'thought',
        kind: 'item',
        isGroup: false,
        children: '[]',
        sessionId: 's',
        cacheOrder: 1,
      } as any,
    ]
    const items = toReActChatItems('reAct', data)
    expect(items[0]).toMatchObject({ token: 'g1', isGroup: true, isCached: true })
    expect(items[1]).toMatchObject({ token: 'i1', isGroup: false, kind: 'item' })
  })

  it('B9: getTreeDataIds flattens tokens', () => {
    const tree: DialogueRecord[] = [
      {
        token: 'a',
        children: JSON.stringify([{ token: 'b', children: '[]' }]),
      } as any,
    ]
    expect(getTreeDataIds(tree)).toEqual(['a', 'b'])
  })

  it('B9: toDialogueData', () => {
    const rows = toDialogueData(
      [
        { token: 't1', type: 'thought', kind: 'item', children: [] } as any,
        { token: 'g1', type: 'stream', kind: 'group', children: ['c1'] } as any,
      ],
      'sid',
    )
    expect(rows[0]).toMatchObject({ token: 't1', isGroup: false, sessionId: 'sid', cacheOrder: 0 })
    expect(rows[1].isGroup).toBe(true)
    expect(JSON.parse(rows[1].children)).toEqual(['c1'])
  })
})

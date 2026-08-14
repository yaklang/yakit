import { describe, it, expect, vi } from 'vitest'
import { createChatStore } from '../chatStore'

describe('replaceItemToken', () => {
  it('C5: renames token in items and elements', () => {
    const onRenderStructureChange = vi.fn()
    const store = createChatStore({ onRenderStructureChange })
    store.getState().dispatchStreamingNode({
      chatType: 'reAct',
      node: { token: 'old', kind: 'item', type: 'thought' },
    })
    onRenderStructureChange.mockClear()

    store.getState().replaceItemToken('old', 'new')
    expect(store.getState().items['old']).toBeUndefined()
    expect(store.getState().items['new']).toBeTruthy()
    expect(store.getState().chatElements.some((e) => e.token === 'new')).toBe(true)
    expect(onRenderStructureChange).toHaveBeenCalledTimes(1)
  })

  it('C5: missing oldToken is no-op and does not notify structure change', () => {
    const onRenderStructureChange = vi.fn()
    const store = createChatStore({ onRenderStructureChange })
    store.getState().replaceItemToken('missing', 'new')
    expect(store.getState().items['new']).toBeUndefined()
    expect(onRenderStructureChange).not.toHaveBeenCalled()
  })
})

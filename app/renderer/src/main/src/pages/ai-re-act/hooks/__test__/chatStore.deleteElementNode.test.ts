import { describe, it, expect, vi } from 'vitest'
import { createChatStore } from '../chatStore'

describe('deleteElementNode', () => {
  it('C4: removes item from elements and notifies content delete', () => {
    const onRenderStructureChange = vi.fn()
    const store = createChatStore({ onRenderStructureChange })
    const onDelContent = vi.fn()
    store.getState().dispatchStreamingNode({
      chatType: 'reAct',
      node: { token: 'del-me', kind: 'item', type: 'thought' },
    })
    onRenderStructureChange.mockClear()

    store.getState().deleteElementNode({
      token: 'del-me',
      kind: 'item',
      chatType: 'reAct',
      onDelContent,
    })
    expect(onDelContent).toHaveBeenCalledWith('del-me')
    expect(store.getState().chatElements.some((e) => e.token === 'del-me')).toBe(false)
    expect(onRenderStructureChange).toHaveBeenCalledTimes(1)
  })

  it('C4: missing token is no-op and does not notify structure change', () => {
    const onRenderStructureChange = vi.fn()
    const store = createChatStore({ onRenderStructureChange })
    const onDelContent = vi.fn()
    store.getState().deleteElementNode({
      token: 'absent',
      kind: 'item',
      chatType: 'reAct',
      onDelContent,
    })
    expect(onDelContent).not.toHaveBeenCalled()
    expect(onRenderStructureChange).not.toHaveBeenCalled()
  })
})

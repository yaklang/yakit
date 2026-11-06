import React from 'react'
import { act, cleanup, render } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { SessionTabsContext } from '../SessionTabsContext'
import { useSessionModal } from '../useSessionModal'
let result: ReturnType<typeof useSessionModal>
function Harness() {
  result = useSessionModal()
  return null
}
afterEach(cleanup)
it('destroys only its own confirmation when a pane becomes hidden', () => {
  const mine = { destroy: vi.fn() },
    other = { destroy: vi.fn() }
  const h = render(
    <SessionTabsContext.Provider value={{ active: true, pageId: 'a' }}>
      <Harness />
    </SessionTabsContext.Provider>,
  )
  act(() => result.ownDialog(mine))
  h.rerender(
    <SessionTabsContext.Provider value={{ active: false, pageId: 'a' }}>
      <Harness />
    </SessionTabsContext.Provider>,
  )
  expect(mine.destroy).toHaveBeenCalledTimes(1)
  expect(other.destroy).not.toHaveBeenCalled()
})
it('immediately closes a late confirmation from an inactive pane', () => {
  render(
    <SessionTabsContext.Provider value={{ active: false }}>
      <Harness />
    </SessionTabsContext.Provider>,
  )
  const late = { destroy: vi.fn() }
  act(() => result.ownDialog(late))
  expect(late.destroy).toHaveBeenCalledTimes(1)
})
it('replaces an old confirmation and releases the current one on unmount', () => {
  const h = render(
    <SessionTabsContext.Provider value={{ active: true }}>
      <Harness />
    </SessionTabsContext.Provider>,
  )
  const first = { destroy: vi.fn() },
    second = { destroy: vi.fn() }
  act(() => {
    result.ownDialog(first)
    result.ownDialog(second)
  })
  expect(first.destroy).toHaveBeenCalledTimes(1)
  expect(second.destroy).not.toHaveBeenCalled()
  h.unmount()
  expect(second.destroy).toHaveBeenCalledTimes(1)
})

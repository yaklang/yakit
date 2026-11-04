import { describe, expect, it } from 'vitest'
import { closeFileTab, emptyFileTabs, openFileTab } from '../useFilePreviewTabs'
const file = (path: string) => ({ path, name: path, isFolder: false }) as any
describe('per-session file tab state', () => {
  it('opens multiple files, deduplicates by path and retains independent search highlights', () => {
    const highlight = [{ startLineNumber: 3, startColumn: 1, endLineNumber: 3, endColumn: 4 }]
    const first = openFileTab(emptyFileTabs('A'), file('first'), highlight)
    const second = openFileTab(first, file('second'))
    const again = openFileTab(second, file('first'), highlight)
    expect(again.files.map((x) => x.path)).toEqual(['first', 'second'])
    expect(again.active).toBe('first')
    expect(again.highlights.first).toEqual(highlight)
    expect(first.files).toHaveLength(1)
  })
  it('closing active tabs selects a neighbor and closing the last returns empty preview', () => {
    const state = openFileTab(openFileTab(emptyFileTabs('A'), file('a')), file('b'))
    const closed = closeFileTab(state, 'b')
    expect(closed.active).toBe('a')
    expect(closeFileTab(closed, 'a')).toMatchObject({ files: [], active: '', highlights: {} })
    expect(state.files).toHaveLength(2)
  })
  it('folder selection is not a preview and another session starts independently', () => {
    const state = emptyFileTabs('A')
    expect(openFileTab(state, { ...file('folder'), isFolder: true })).toBe(state)
    expect(emptyFileTabs('B')).toEqual({ scope: 'B', files: [], active: '', highlights: {} })
  })
})

it('keeps active files and highlights isolated across actual hook session changes', async () => {
  const React = await import('react')
  const { render, act, cleanup } = await import('@testing-library/react')
  const { useFilePreviewTabs } = await import('../useFilePreviewTabs')
  let value!: ReturnType<typeof useFilePreviewTabs>
  const Harness = ({ scope }: { scope: string }) => {
    value = useFilePreviewTabs(scope)
    return React.createElement('div')
  }
  const { rerender, unmount } = render(React.createElement(Harness, { scope: 'A' }))
  act(() => value.open(file('A.txt')))
  expect(value.state.active).toBe('A.txt')
  rerender(React.createElement(Harness, { scope: 'B' }))
  expect(value.state.files).toEqual([])
  act(() => value.open(file('B.txt')))
  expect(value.state.active).toBe('B.txt')
  rerender(React.createElement(Harness, { scope: 'A' }))
  expect(value.state.files).toEqual([])
  unmount()
  cleanup()
})

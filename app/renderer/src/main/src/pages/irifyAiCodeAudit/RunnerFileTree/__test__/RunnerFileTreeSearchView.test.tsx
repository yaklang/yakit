import { act, fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { FileSearchFileItem, FileSearchLine } from '@/components/FileTreeContentSearch'
import type * as FileTreeContentSearchModule from '@/components/FileTreeContentSearch'
import { RunnerFileTreeSearchView } from '../RunnerFileTreeSearchView'

const { emit } = vi.hoisted(() => ({ emit: vi.fn() }))

vi.mock('@/utils/eventBus/eventBus', () => ({ default: { emit } }))

vi.mock('@/components/FileTreeContentSearch', async (importOriginal) => {
  const actual = await importOriginal<typeof FileTreeContentSearchModule>()
  return {
    ...actual,
    FileTreeContentSearchView: ({
      onOpen,
      onSearchSettled,
    }: {
      onOpen: (path: string, line?: FileSearchLine, fileItem?: FileSearchFileItem) => void
      onSearchSettled?: () => void
    }) => {
      const fileItem: FileSearchFileItem = {
        path: 'project/demo.txt',
        name: 'demo.txt',
        searchResult: {
          match_count: 3,
          results: [
            {
              line: 3,
              text: 'hello world foo',
              matches: [
                { start_column: 1, end_column: 6 },
                { start_column: 13, end_column: 16 },
              ],
            },
            { line: 9, text: 'foo bar', matches: [{ start_column: 1, end_column: 4 }] },
          ],
        },
      }
      return (
        <div data-testid="ai-code-audit-file-tree-search-view-stub">
          <button
            type="button"
            data-testid="open-file-header"
            onClick={() => onOpen(fileItem.path, undefined, fileItem)}
          >
            open file
          </button>
          <button
            type="button"
            data-testid="open-file-line"
            onClick={() => onOpen(fileItem.path, fileItem.searchResult.results[0], fileItem)}
          >
            open line
          </button>
          <button type="button" data-testid="search-settled" onClick={() => onSearchSettled?.()}>
            search settled
          </button>
        </div>
      )
    },
  }
})

beforeEach(() => {
  emit.mockReset()
})

const allHits = [
  { startLineNumber: 3, startColumn: 1, endLineNumber: 3, endColumn: 6 },
  { startLineNumber: 3, startColumn: 13, endLineNumber: 3, endColumn: 16 },
  { startLineNumber: 9, startColumn: 1, endLineNumber: 9, endColumn: 4 },
]

const openPayload = {
  params: {
    path: 'project/demo.txt',
    name: 'demo.txt',
    parent: null,
    highLightRange: allHits,
  },
}

const revealPayload = JSON.stringify({ path: 'project/demo.txt', lineNumber: 3, column: 1 })

describe('IrifyAiCodeAudit RunnerFileTreeSearchView', () => {
  it('点文件头打开时 highLightRange 含全部命中，并请求滚动到首个命中', () => {
    render(<RunnerFileTreeSearchView roots={[{ path: 'project' }]} active />)

    fireEvent.click(screen.getByTestId('open-file-header'))

    expect(emit).toHaveBeenCalledWith('onAiCodeAuditOpenFileByPath', JSON.stringify(openPayload))
    expect(emit).toHaveBeenCalledWith('onAiCodeAuditRevealSearchHit', revealPayload)
  })

  it('点命中行打开时 highLightRange 含该文件全部命中，并请求滚动', () => {
    render(<RunnerFileTreeSearchView roots={[{ path: 'project' }]} active />)

    fireEvent.click(screen.getByTestId('open-file-line'))

    expect(emit).toHaveBeenCalledWith('onAiCodeAuditOpenFileByPath', JSON.stringify(openPayload))
    expect(emit).toHaveBeenCalledWith('onAiCodeAuditRevealSearchHit', revealPayload)
  })

  it('同一行再点一次仍发出滚动事件', () => {
    render(<RunnerFileTreeSearchView roots={[{ path: 'project' }]} active />)

    fireEvent.click(screen.getByTestId('open-file-line'))
    fireEvent.click(screen.getByTestId('open-file-line'))

    const revealCalls = emit.mock.calls.filter((call) => call[0] === 'onAiCodeAuditRevealSearchHit')
    expect(revealCalls).toHaveLength(2)
    expect(revealCalls[1][1]).toBe(revealPayload)
  })

  it('搜索结束后发出清空搜索高亮事件', () => {
    render(<RunnerFileTreeSearchView roots={[{ path: 'project' }]} active />)
    fireEvent.click(screen.getByTestId('search-settled'))
    expect(emit).toHaveBeenCalledWith('onAiCodeAuditClearFileSearchHighlights')
  })

  it('关闭搜索面板时发出清空搜索高亮事件', () => {
    const { rerender } = render(<RunnerFileTreeSearchView roots={[{ path: 'project' }]} active />)
    emit.mockClear()
    act(() => {
      rerender(<RunnerFileTreeSearchView roots={[{ path: 'project' }]} active={false} />)
    })
    expect(emit).toHaveBeenCalledWith('onAiCodeAuditClearFileSearchHighlights')
  })
})

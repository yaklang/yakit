import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { FileSearchFileItem, FileSearchLine } from '@/components/FileTreeContentSearch'
import { RunnerFileTreeSearchView } from '../RunnerFileTreeSearchView'

const { emit } = vi.hoisted(() => ({ emit: vi.fn() }))

vi.mock('@/utils/eventBus/eventBus', () => ({ default: { emit } }))

vi.mock('@/components/FileTreeContentSearch', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/components/FileTreeContentSearch')>()
  return {
    ...actual,
    FileTreeContentSearchView: ({
      onOpen,
    }: {
      onOpen: (path: string, line?: FileSearchLine, fileItem?: FileSearchFileItem) => void
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
        <div data-testid="runner-file-tree-search-view-stub">
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
        </div>
      )
    },
  }
})

beforeEach(() => {
  emit.mockReset()
})

describe('RunnerFileTreeSearchView', () => {
  it('点文件头打开时 highLightRange 含全部命中', () => {
    render(<RunnerFileTreeSearchView roots={[{ path: 'project' }]} active />)

    fireEvent.click(screen.getByTestId('open-file-header'))

    expect(emit).toHaveBeenCalledWith(
      'onOpenFileByPath',
      JSON.stringify({
        params: {
          path: 'project/demo.txt',
          name: 'demo.txt',
          parent: null,
          highLightRange: [
            { startLineNumber: 3, startColumn: 1, endLineNumber: 3, endColumn: 6 },
            { startLineNumber: 3, startColumn: 13, endLineNumber: 3, endColumn: 16 },
            { startLineNumber: 9, startColumn: 1, endLineNumber: 9, endColumn: 4 },
          ],
        },
      }),
    )
  })

  it('点命中行打开时 highLightRange 仅含该行命中', () => {
    render(<RunnerFileTreeSearchView roots={[{ path: 'project' }]} active />)

    fireEvent.click(screen.getByTestId('open-file-line'))

    expect(emit).toHaveBeenCalledWith(
      'onOpenFileByPath',
      JSON.stringify({
        params: {
          path: 'project/demo.txt',
          name: 'demo.txt',
          parent: null,
          highLightRange: [
            { startLineNumber: 3, startColumn: 1, endLineNumber: 3, endColumn: 6 },
            { startLineNumber: 3, startColumn: 13, endLineNumber: 3, endColumn: 16 },
          ],
        },
      }),
    )
  })
})

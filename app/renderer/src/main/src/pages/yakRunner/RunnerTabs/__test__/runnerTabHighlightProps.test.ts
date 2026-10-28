import { describe, expect, it, vi } from 'vitest'
import type { Selection } from '../RunnerTabsType'
import { getRunnerEditorHighlightProps, revealFirstHighlight } from '../runnerTabHighlightProps'

describe('getRunnerEditorHighlightProps（RunnerTabPane 搜索定位）', () => {
  it('多命中（搜索结果，含已打开/新开文件）走 file-search-hit，定位到首个命中行', () => {
    const ranges: Selection[] = [
      { startLineNumber: 500, startColumn: 1, endLineNumber: 500, endColumn: 6 },
      { startLineNumber: 510, startColumn: 2, endLineNumber: 510, endColumn: 5 },
    ]
    const props = getRunnerEditorHighlightProps(ranges)
    expect(props.highLightFind).toEqual(ranges)
    expect(props.highLightFind[0].startLineNumber).toBe(500)
    expect(props.highLightFindClass).toBe('hight-light-file-search-hit')
    expect(props.isPositionHighLightCursor).toBe(true)
  })

  it('单区间走 yak-runner-color，同样开启定位', () => {
    const range: Selection = { startLineNumber: 12, startColumn: 1, endLineNumber: 12, endColumn: 3 }
    const props = getRunnerEditorHighlightProps(range)
    expect(props.highLightFind).toEqual([range])
    expect(props.highLightFindClass).toBe('hight-light-yak-runner-color')
    expect(props.isPositionHighLightCursor).toBe(true)
  })

  it('无高亮时不定位', () => {
    const props = getRunnerEditorHighlightProps(undefined)
    expect(props.highLightFind).toEqual([])
    expect(props.isPositionHighLightCursor).toBe(false)
  })
})

describe('revealFirstHighlight', () => {
  it('多命中时滚到第一段', () => {
    const revealPositionInCenter = vi.fn()
    revealFirstHighlight({ revealPositionInCenter }, [
      { startLineNumber: 80, startColumn: 1, endLineNumber: 80, endColumn: 7 },
      { startLineNumber: 2, startColumn: 1, endLineNumber: 2, endColumn: 3 },
    ])
    expect(revealPositionInCenter).toHaveBeenCalledWith({ lineNumber: 80, column: 1 })
  })

  it('单区间同样滚动', () => {
    const revealPositionInCenter = vi.fn()
    revealFirstHighlight(
      { revealPositionInCenter },
      {
        startLineNumber: 12,
        startColumn: 4,
        endLineNumber: 12,
        endColumn: 8,
      },
    )
    expect(revealPositionInCenter).toHaveBeenCalledWith({ lineNumber: 12, column: 4 })
  })

  it('没有编辑器或高亮时不滚动', () => {
    const revealPositionInCenter = vi.fn()
    revealFirstHighlight(undefined, [{ startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: 2 }])
    revealFirstHighlight({ revealPositionInCenter }, undefined)
    expect(revealPositionInCenter).not.toHaveBeenCalled()
  })
})

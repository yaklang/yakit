import { describe, expect, it } from 'vitest'
import { clearFileSearchHighlights } from '../clearFileSearchHighlights'
import type { AreaInfoProps } from '../YakRunnerType'
import type { FileDetailInfo } from '../RunnerTabs/RunnerTabsType'

const highlight = {
  startLineNumber: 1,
  startColumn: 1,
  endLineNumber: 1,
  endColumn: 4,
}

const fileWithHighlight = (path: string, withHighlight = true): FileDetailInfo =>
  ({
    name: path.split('/').pop() || path,
    path,
    code: 'test',
    icon: 'txt',
    openTimestamp: 0,
    isPlainText: true,
    ...(withHighlight ? { highLightRange: [highlight] } : {}),
  }) as FileDetailInfo

describe('YakRunner clearFileSearchHighlights（onClearFileSearchHighlightsFun）', () => {
  it('清除 areaInfo 与 activeFile 上的搜索高亮', () => {
    const areaInfo: AreaInfoProps[] = [
      {
        elements: [
          {
            id: 'tab-1',
            files: [fileWithHighlight('/a.txt'), fileWithHighlight('/b.txt', false)],
          },
        ],
      },
    ]
    const activeFile = fileWithHighlight('/a.txt')

    const next = clearFileSearchHighlights(areaInfo, activeFile)

    expect(next.areaChanged).toBe(true)
    expect(next.activeChanged).toBe(true)
    expect(next.areaInfo[0].elements[0].files[0].highLightRange).toBeUndefined()
    expect(next.areaInfo[0].elements[0].files[1].highLightRange).toBeUndefined()
    expect(next.activeFile?.highLightRange).toBeUndefined()
    // 无高亮文件保持引用，便于 changed 优化
    expect(next.areaInfo[0].elements[0].files[1]).toBe(areaInfo[0].elements[0].files[1])
  })

  it('无任何高亮时 areaChanged/activeChanged 为 false（不触发 setState）', () => {
    const areaInfo: AreaInfoProps[] = [
      {
        elements: [
          {
            id: 'tab-1',
            files: [fileWithHighlight('/a.txt', false)],
          },
        ],
      },
    ]
    const activeFile = fileWithHighlight('/a.txt', false)

    const next = clearFileSearchHighlights(areaInfo, activeFile)

    expect(next.areaChanged).toBe(false)
    expect(next.activeChanged).toBe(false)
    expect(next.activeFile).toBe(activeFile)
    expect(next.areaInfo[0].elements[0].files[0]).toBe(areaInfo[0].elements[0].files[0])
  })
})

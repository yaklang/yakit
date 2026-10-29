import { describe, expect, it } from 'vitest'
import { clearFileSearchHighlights, stripPersistedFileSearchHighlights } from '../clearFileSearchHighlights'
import type { AreaInfoProps } from '../YakRunnerType'
import type { FileDetailInfo } from '../RunnerTabs/RunnerTabsType'

const highlight = {
  startLineNumber: 1,
  startColumn: 1,
  endLineNumber: 1,
  endColumn: 4,
}

const baseFile = (path: string): FileDetailInfo =>
  ({
    name: path.split('/').pop() || path,
    path,
    code: 'test',
    icon: 'txt',
    openTimestamp: 0,
    isPlainText: true,
  }) as FileDetailInfo

const fileWithSearchHighlight = (path: string): FileDetailInfo =>
  ({ ...baseFile(path), highLightRange: [highlight] }) as FileDetailInfo

const fileWithCodeRefHighlight = (path: string): FileDetailInfo =>
  ({ ...baseFile(path), highLightRange: highlight }) as FileDetailInfo

describe('YakRunner clearFileSearchHighlights（onClearFileSearchHighlightsFun）', () => {
  it('清除 areaInfo 与 activeFile 上的搜索高亮（数组）', () => {
    const areaInfo: AreaInfoProps[] = [
      {
        elements: [
          {
            id: 'tab-1',
            files: [fileWithSearchHighlight('/a.txt'), baseFile('/b.txt')],
          },
        ],
      },
    ]
    const activeFile = fileWithSearchHighlight('/a.txt')

    const next = clearFileSearchHighlights(areaInfo, activeFile)

    expect(next.areaChanged).toBe(true)
    expect(next.activeChanged).toBe(true)
    expect(next.areaInfo[0].elements[0].files[0].highLightRange).toBeUndefined()
    expect(next.areaInfo[0].elements[0].files[1].highLightRange).toBeUndefined()
    expect(next.activeFile?.highLightRange).toBeUndefined()
    // 无高亮文件保持引用，便于 changed 优化
    expect(next.areaInfo[0].elements[0].files[1]).toBe(areaInfo[0].elements[0].files[1])
  })

  it('单对象代码引用高亮保持不变', () => {
    const codeRefFile = fileWithCodeRefHighlight('/ref.txt')
    const areaInfo: AreaInfoProps[] = [
      {
        elements: [
          {
            id: 'tab-1',
            files: [codeRefFile, fileWithSearchHighlight('/search.txt')],
          },
        ],
      },
    ]
    const activeFile = fileWithCodeRefHighlight('/ref.txt')

    const next = clearFileSearchHighlights(areaInfo, activeFile)

    expect(next.areaChanged).toBe(true)
    expect(next.activeChanged).toBe(false)
    expect(next.areaInfo[0].elements[0].files[0].highLightRange).toEqual(highlight)
    expect(next.areaInfo[0].elements[0].files[0]).toBe(codeRefFile)
    expect(next.areaInfo[0].elements[0].files[1].highLightRange).toBeUndefined()
    expect(next.activeFile).toBe(activeFile)
    expect(next.activeFile?.highLightRange).toEqual(highlight)
  })

  it('无任何高亮时 areaChanged/activeChanged 为 false（不触发 setState）', () => {
    const areaInfo: AreaInfoProps[] = [
      {
        elements: [
          {
            id: 'tab-1',
            files: [baseFile('/a.txt')],
          },
        ],
      },
    ]
    const activeFile = baseFile('/a.txt')

    const next = clearFileSearchHighlights(areaInfo, activeFile)

    expect(next.areaChanged).toBe(false)
    expect(next.activeChanged).toBe(false)
    expect(next.activeFile).toBe(activeFile)
    expect(next.areaInfo[0].elements[0].files[0]).toBe(areaInfo[0].elements[0].files[0])
  })

  it('仅有单对象高亮时不触发 changed', () => {
    const areaInfo: AreaInfoProps[] = [
      {
        elements: [
          {
            id: 'tab-1',
            files: [fileWithCodeRefHighlight('/ref.txt')],
          },
        ],
      },
    ]
    const activeFile = fileWithCodeRefHighlight('/ref.txt')

    const next = clearFileSearchHighlights(areaInfo, activeFile)

    expect(next.areaChanged).toBe(false)
    expect(next.activeChanged).toBe(false)
    expect(next.areaInfo[0].elements[0].files[0].highLightRange).toEqual(highlight)
    expect(next.activeFile?.highLightRange).toEqual(highlight)
  })
})

describe('stripPersistedFileSearchHighlights（重启工程不恢复搜索高亮）', () => {
  it('历史里的搜索高亮数组被去掉，代码引用单区间保留', () => {
    const areaInfo: AreaInfoProps[] = [
      {
        elements: [
          {
            id: 'tab-1',
            files: [fileWithSearchHighlight('/a.txt'), fileWithCodeRefHighlight('/ref.txt')],
          },
        ],
      },
    ]
    const persist = stripPersistedFileSearchHighlights(areaInfo, fileWithSearchHighlight('/a.txt'))
    expect(persist.areaInfo[0].elements[0].files[0].highLightRange).toBeUndefined()
    expect(persist.areaInfo[0].elements[0].files[1].highLightRange).toEqual(highlight)
    expect(persist.activeFile?.highLightRange).toBeUndefined()
  })
})

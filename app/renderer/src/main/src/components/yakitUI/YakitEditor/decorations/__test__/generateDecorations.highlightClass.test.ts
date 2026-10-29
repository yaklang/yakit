import { describe, expect, it, vi } from 'vitest'

vi.mock('react-monaco-editor', () => ({
  monaco: {
    Range: class Range {
      constructor(
        public startLineNumber: number,
        public startColumn: number,
        public endLineNumber: number,
        public endColumn: number,
      ) {}
    },
  },
}))

import { generateDecorations } from '../generateDecorations'

const hit = { startLineNumber: 2, startColumn: 1, endLineNumber: 2, endColumn: 7 }

const model = {
  getPositionAt: () => ({ lineNumber: 1, column: 1 }),
  getValueInRange: () => '',
  getValue: () => '',
}

const editor = { getPosition: () => null }

const base = {
  model: model as never,
  editor: editor as never,
  privacy: false,
  disableUnicodeDecode: true,
  highLightText: [],
  highLightFind: [hit],
  foldBinaryEnabled: false,
  binaryFoldEntriesRef: { current: new Map() },
  binaryFoldRangesRef: { current: [] },
  binaryModifiedOrdinalsRef: { current: new Set<number>() },
  language: 'zh',
  t: ((key: string) => key) as never,
}

const findClass = (highLightFindClass: string) =>
  generateDecorations({ ...base, highLightFindClass } as never).find((item) =>
    String(item.id).startsWith('hight-light-find_'),
  )?.options.className

describe('generateDecorations 高亮类名', () => {
  it('同一坐标换成引用类时，装饰使用新类名', () => {
    expect(findClass('hight-light-file-search-hit')).toBe('hight-light-file-search-hit')
    expect(findClass('hight-light-yak-runner-color')).toBe('hight-light-yak-runner-color')
  })
})

import { describe, expect, it } from 'vitest'
import { clipLineAroundMatches, resolveOpenHighlights } from '../utils'
import type { FileSearchFileItem, FileSearchLine } from '../type'

const lineOf = (text: string, matches: FileSearchLine['matches'], line = 1): FileSearchLine => ({
  line,
  text,
  matches,
})

describe('clipLineAroundMatches', () => {
  it('短行原样返回（首命中靠前且总长 ≤ contextChars*3）', () => {
    const text = 'prefix HIT suffix'
    const input = lineOf(text, [{ start_column: 8, end_column: 11 }])
    expect(clipLineAroundMatches(input, 28)).toEqual(input)
  })

  it('长行在首命中前裁剪，并重映射列号', () => {
    const contextChars = 10
    // 首命中起点 index=50 > contextChars，触发裁剪
    const text = `${'a'.repeat(50)}HIT${'b'.repeat(50)}`
    const input = lineOf(text, [{ start_column: 51, end_column: 54 }])

    const result = clipLineAroundMatches(input, contextChars)

    expect(result.text.startsWith('…')).toBe(true)
    expect(result.text.endsWith('…')).toBe(true)
    expect(result.text).toContain('HIT')
    expect(result.text.length).toBeLessThan(text.length)
    // start=40, prefixLen=1 → HIT 列号变为 50-40+1+1=12 … 53-40+1+1=15
    expect(result.matches).toEqual([{ start_column: 12, end_column: 15 }])
  })

  it('命中跨度超过 maxWindow 时按首命中截断窗口', () => {
    const contextChars = 10
    // maxWindow = 10*2+48=68；首尾命中跨度需使 end-start > 68
    const text = `${'a'.repeat(40)}HIT${'b'.repeat(80)}TAIL${'c'.repeat(40)}`
    const input = lineOf(text, [
      { start_column: 41, end_column: 44 },
      { start_column: 124, end_column: 128 },
    ])

    const result = clipLineAroundMatches(input, contextChars)

    // 截断后 end = firstStart + contextChars + max(8, hitLen) = 40+10+8 = 58
    // 窗口不足以容纳 TAIL，文本应含 HIT、不含 TAIL
    expect(result.text).toContain('HIT')
    expect(result.text).not.toContain('TAIL')
    expect(result.text.length).toBeLessThanOrEqual(contextChars * 2 + 48 + 2) // +两侧省略号
  })

  it('窗口外的命中会被过滤', () => {
    const contextChars = 10
    const text = `${'a'.repeat(40)}HIT${'b'.repeat(80)}TAIL${'c'.repeat(40)}`
    const input = lineOf(text, [
      { start_column: 41, end_column: 44 },
      { start_column: 124, end_column: 128 },
    ])

    const result = clipLineAroundMatches(input, contextChars)

    expect(result.matches).toHaveLength(1)
    expect(result.matches[0]).toEqual({ start_column: 12, end_column: 15 })
  })
})

describe('resolveOpenHighlights', () => {
  const fileItem: FileSearchFileItem = {
    path: 'a.txt',
    name: 'a.txt',
    searchResult: {
      match_count: 2,
      results: [
        lineOf('hello', [{ start_column: 1, end_column: 6 }], 1),
        lineOf('world', [{ start_column: 1, end_column: 6 }], 2),
      ],
    },
  }

  it('点命中行只用该行', () => {
    expect(resolveOpenHighlights(fileItem.searchResult.results[0], fileItem)).toEqual([
      { startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: 6 },
    ])
  })

  it('点文件头用全部命中行', () => {
    expect(resolveOpenHighlights(undefined, fileItem)).toEqual([
      { startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: 6 },
      { startLineNumber: 2, startColumn: 1, endLineNumber: 2, endColumn: 6 },
    ])
  })
})

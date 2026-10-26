import { beforeEach, describe, expect, it, vi } from 'vitest'

const { invoke } = vi.hoisted(() => {
  const invoke = vi.fn()
  Object.defineProperty(window, 'require', {
    configurable: true,
    value: () => ({
      ipcRenderer: {
        invoke,
        on: () => {},
        removeListener: () => {},
        removeAllListeners: () => {},
        send: () => {},
      },
    }),
  })
  return { invoke }
})

import {
  clipLineAroundMatches,
  FILE_SEARCH_UNSUPPORTED_ENGINE,
  grpcSearchFileContent,
  resolveOpenHighlights,
} from '../utils'
import type { FileSearchFileItem, FileSearchLine } from '../type'

beforeEach(() => {
  invoke.mockReset()
})

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

  it('点命中行仍带全部命中，并把该行放前面', () => {
    expect(resolveOpenHighlights(fileItem.searchResult.results[1], fileItem)).toEqual([
      { startLineNumber: 2, startColumn: 1, endLineNumber: 2, endColumn: 6 },
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

describe('grpcSearchFileContent', () => {
  it('构造 RequestYakURL query / token（含 regex、ignoreCase）', async () => {
    invoke.mockResolvedValueOnce({ Resources: [] })
    await grpcSearchFileContent({
      path: '/tmp/root',
      keyword: 'foo.*',
      regex: true,
      ignoreCase: true,
      token: 'tok-1',
    })

    expect(invoke).toHaveBeenCalledWith(
      'RequestYakURL',
      {
        Method: 'GET',
        Url: {
          Schema: 'file',
          Path: '/tmp/root',
          Query: [
            { Key: 'op', Value: 'search' },
            { Key: 'keyword', Value: 'foo.*' },
            { Key: 'global', Value: 'true' },
            { Key: 'regex', Value: 'true' },
            { Key: 'ignoreCase', Value: 'true' },
          ],
        },
      },
      'tok-1',
    )
  })

  it('单文件根无 search_result 时识别为不支持（不依赖 ResourceType=dir）', async () => {
    invoke.mockResolvedValueOnce({
      Resources: [
        {
          ResourceType: '',
          ResourceName: 'a.js',
          Path: '/tmp/a.js',
          Extra: [{ Key: 'Directory-Name', Value: 'a.js' }],
        },
      ],
    })

    await expect(grpcSearchFileContent({ path: '/tmp/a.js', keyword: 'foo' })).rejects.toThrow(
      FILE_SEARCH_UNSUPPORTED_ENGINE,
    )
  })

  it('空 Resources 视为真正无命中，不抛不支持', async () => {
    invoke.mockResolvedValueOnce({ Resources: [] })
    await expect(grpcSearchFileContent({ path: '/tmp', keyword: 'foo' })).resolves.toEqual([])
  })

  it('带 search_result 的命中正常解析', async () => {
    invoke.mockResolvedValueOnce({
      Resources: [
        {
          ResourceType: '',
          ResourceName: 'a.js',
          Path: '/tmp/a.js',
          Extra: [
            {
              Key: 'search_result',
              Value: JSON.stringify({
                match_count: 1,
                results: [{ line: 1, text: 'foo', matches: [{ start_column: 1, end_column: 4 }] }],
              }),
            },
          ],
        },
      ],
    })

    await expect(grpcSearchFileContent({ path: '/tmp', keyword: 'foo' })).resolves.toEqual([
      {
        path: '/tmp/a.js',
        name: 'a.js',
        searchResult: {
          match_count: 1,
          results: [{ line: 1, text: 'foo', matches: [{ start_column: 1, end_column: 4 }] }],
        },
      },
    ])
  })

  it('malformed search_result JSON 被跳过，不抛错也不当不支持', async () => {
    invoke.mockResolvedValueOnce({
      Resources: [
        {
          ResourceType: '',
          ResourceName: 'bad.js',
          Path: '/tmp/bad.js',
          Extra: [{ Key: 'search_result', Value: '{not-json' }],
        },
        {
          ResourceType: '',
          ResourceName: 'ok.js',
          Path: '/tmp/ok.js',
          Extra: [
            {
              Key: 'search_result',
              Value: JSON.stringify({
                match_count: 1,
                results: [{ line: 2, text: 'bar', matches: [{ start_column: 1, end_column: 4 }] }],
              }),
            },
          ],
        },
      ],
    })

    await expect(grpcSearchFileContent({ path: '/tmp', keyword: 'bar' })).resolves.toEqual([
      {
        path: '/tmp/ok.js',
        name: 'ok.js',
        searchResult: {
          match_count: 1,
          results: [{ line: 2, text: 'bar', matches: [{ start_column: 1, end_column: 4 }] }],
        },
      },
    ])
  })
})

import { readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'

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

// 只借方向判断，避免把整页 HTTPFuzzerPage 拉进这个用例。
vi.mock('../../HTTPFuzzerPage', () => ({
  isResponseChunkedData: (chunk?: { Direction?: number }) => {
    if (!chunk) return false
    const dir = chunk.Direction ?? 0
    return dir === 0 || dir === 2
  },
}))

import type { RandomChunkedResponse } from '../../HTTPFuzzerPage'
import { useChunkAutoScrollToBottom } from '../useAutoScrollToBottom'

const body = (text: string, index: number): RandomChunkedResponse => ({
  Data: new TextEncoder().encode(text),
  Index: index,
  ChunkedLength: 0,
  CurrentChunkedDelayTime: 0,
  TotalDelayTime: 0,
  IsFinal: false,
  Direction: 2,
})

const editorWith = (edits: string[]) => ({
  getModel: () => ({
    getLineCount: () => 1,
    getLineMaxColumn: () => 1,
    applyEdits: (list: { text: string }[]) => {
      edits.push(list.map((item) => item.text).join(''))
    },
  }),
  revealLine: () => undefined,
  onDidScrollChange: () => ({ dispose: () => undefined }),
  getScrollTop: () => 0,
  getScrollHeight: () => 0,
  getLayoutInfo: () => ({ height: 0 }),
})

describe('streamed response body', () => {
  it('replays consumed chunks when the editor base text is replaced', async () => {
    const edits: string[] = []
    const chunks = [body('hello', 1), body(' world', 2)]
    const { result, rerender } = renderHook(
      ({ chunkedData, resetKey }: { chunkedData: RandomChunkedResponse[]; resetKey?: string }) =>
        useChunkAutoScrollToBottom({
          chunkedData,
          id: 'same-response',
          resetKey,
        }),
      {
        initialProps: {
          chunkedData: [] as RandomChunkedResponse[],
          resetKey: 'HTTP/1.1 200' as string | undefined,
        },
      },
    )
    act(() => {
      result.current.handleEditorMount(editorWith(edits) as never)
    })
    // 编辑器先挂上，chunk 后到。节流只在 chunk 变化时跑，挂载前跑过就不会再追加。
    rerender({ chunkedData: chunks, resetKey: 'HTTP/1.1 200' })
    await waitFor(() => expect(edits.join('')).toBe('hello world'), { timeout: 2500 })

    rerender({ chunkedData: chunks, resetKey: 'HTTP/1.1 200 OK' })
    await waitFor(() => expect(edits.join('')).toBe('hello worldhello world'), { timeout: 2500 })

    rerender({ chunkedData: chunks, resetKey: undefined })
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 700))
    })
    expect(edits.join('')).toBe('hello worldhello world')
  })

  it('replays consumed chunks when the editor is mounted again during streaming', async () => {
    const edits: string[] = []
    const chunks = [body('hello', 1), body(' world', 2)]
    const { result, rerender } = renderHook(
      ({ chunkedData, resetKey }: { chunkedData: RandomChunkedResponse[]; resetKey?: string }) =>
        useChunkAutoScrollToBottom({
          chunkedData,
          id: 'same-response',
          resetKey,
        }),
      {
        initialProps: {
          chunkedData: [] as RandomChunkedResponse[],
          resetKey: 'HTTP/1.1 200' as string | undefined,
        },
      },
    )
    act(() => {
      result.current.handleEditorMount(editorWith(edits) as never)
    })
    rerender({ chunkedData: chunks, resetKey: 'HTTP/1.1 200' })
    await waitFor(() => expect(edits.join('')).toBe('hello world'), { timeout: 2500 })

    act(() => {
      result.current.handleEditorMount(editorWith(edits) as never)
    })
    await waitFor(() => expect(edits.join('')).toBe('hello worldhello world'), { timeout: 2500 })
  })

  it('page keeps the streaming header as the editor base', () => {
    const page = readFileSync('app/renderer/src/main/src/pages/fuzzer/HTTPFuzzerPage.tsx', 'utf8')
    expect(page).toContain('resetKey: isStreamingResponse ? streamingHeaderText : undefined')
  })
})

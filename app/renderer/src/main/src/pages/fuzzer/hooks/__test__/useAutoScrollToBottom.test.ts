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
  isResponseChunkedData: (chunk?: { Direction?: number | string }) => {
    if (!chunk) return false
    const dir = chunk.Direction ?? 0
    return dir === 0 || dir === 2
  },
}))

import type { RandomChunkedResponse } from '../../HTTPFuzzerPage'
import {
  fuzzerTablePreview,
  type FuzzerPreviewChunk,
  type FuzzerPreviewMemory,
} from '../../components/HTTPFuzzerPageTable/fuzzerTablePreview'
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

const toPreviewChunks = (list: RandomChunkedResponse[]): FuzzerPreviewChunk[] =>
  list.map((chunk) => ({
    Direction: chunk.Direction,
    IsFinal: chunk.IsFinal,
  }))

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
    expect(page).toContain('resetKey: showHeaderBase ? streamingHeaderText : undefined')
  })

  it('quick preview replays the body when the header arrives and when the editor is mounted again', async () => {
    const edits: string[] = []
    const chunks = [body('hello', 1), body(' world', 2)]
    // 和组件一样：每次渲染都把返回的 memory 留到下一次。
    let memory: FuzzerPreviewMemory = { header: '' }
    const showing = (responseText: string, nextChunks: RandomChunkedResponse[] = chunks) => {
      const seen = fuzzerTablePreview({
        uuid: 'row-1',
        chunks: toPreviewChunks(nextChunks),
        showingResponse: true,
        responseText,
        memory,
      })
      memory = seen.memory
      return seen
    }

    let preview = showing('', [])
    const { result, rerender } = renderHook(
      ({ chunkedData, resetKey }: { chunkedData: RandomChunkedResponse[]; resetKey?: string }) =>
        useChunkAutoScrollToBottom({
          chunkedData,
          id: 'row-1',
          resetKey,
        }),
      {
        initialProps: {
          chunkedData: [] as RandomChunkedResponse[],
          resetKey: preview.resetKey,
        },
      },
    )
    act(() => {
      result.current.handleEditorMount(editorWith(edits) as never)
    })

    // 正文先到，响应头还在库里。
    preview = showing('')
    rerender({ chunkedData: chunks, resetKey: preview.resetKey })
    await waitFor(() => expect(edits.join('')).toBe('hello world'), { timeout: 2500 })

    // 响应头读回来，编辑器基座被换成响应头，已追加的正文要再放一遍。
    preview = showing('HTTP/1.1 200')
    expect(preview.responseText).toBe('HTTP/1.1 200')
    rerender({ chunkedData: chunks, resetKey: preview.resetKey })
    await waitFor(() => expect(edits.join('')).toBe('hello worldhello world'), { timeout: 2500 })

    // 页签藏起来再打开：字节被清掉，基座仍是刚才的响应头，重新挂载后再放一遍。
    preview = showing('')
    expect(preview.responseText).toBe('HTTP/1.1 200')
    expect(preview.resetKey).toBe('HTTP/1.1 200')
    act(() => {
      result.current.handleEditorMount(editorWith(edits) as never)
    })
    await waitFor(() => expect(edits.join('')).toBe('hello worldhello worldhello world'), { timeout: 2500 })

    // 最后一块到了就停。不能因为流结束把已经追加过的正文再追加一遍。
    const finished = chunks.map((chunk, index) => (index === chunks.length - 1 ? { ...chunk, IsFinal: true } : chunk))
    preview = showing('HTTP/1.1 200', finished)
    expect(preview.resetKey).toBeUndefined()
    expect(preview.responseText).toBe('HTTP/1.1 200')
    rerender({ chunkedData: finished, resetKey: preview.resetKey })
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 700))
    })
    expect(edits.join('')).toBe('hello worldhello worldhello world')
  })

  it('does not append chunks when the selected response is already finished', async () => {
    const edits: string[] = []
    const finished = [{ ...body('hello', 1), IsFinal: true }]
    const { result } = renderHook(() =>
      useChunkAutoScrollToBottom({
        chunkedData: finished,
        id: 'done-row',
        resetKey: undefined,
      }),
    )
    act(() => {
      result.current.handleEditorMount(editorWith(edits) as never)
    })
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 700))
    })
    expect(edits.join('')).toBe('')
  })

  it('does not append chunks when switching onto a finished response', async () => {
    const edits: string[] = []
    const streaming = [body('hello', 1)]
    const finished = [{ ...body('hello', 1), IsFinal: true }]
    const { result, rerender } = renderHook(
      ({ id, chunkedData, resetKey }: { id: string; chunkedData: RandomChunkedResponse[]; resetKey?: string }) =>
        useChunkAutoScrollToBottom({
          chunkedData,
          id,
          resetKey,
        }),
      {
        initialProps: {
          id: 'row-a',
          chunkedData: [] as RandomChunkedResponse[],
          resetKey: 'HTTP/1.1 200' as string | undefined,
        },
      },
    )
    act(() => {
      result.current.handleEditorMount(editorWith(edits) as never)
    })
    rerender({ id: 'row-a', chunkedData: streaming, resetKey: 'HTTP/1.1 200' })
    await waitFor(() => expect(edits.join('')).toBe('hello'), { timeout: 2500 })

    // 换到一条已经结束的响应：基座已是完整正文，不能再把 chunk 追成 hellohello
    rerender({ id: 'row-b', chunkedData: finished, resetKey: undefined })
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 700))
    })
    expect(edits.join('')).toBe('hello')
  })

  it('keeps the head already shown when the chunk list shrinks to its tail', async () => {
    const edits: string[] = []
    const head = body('HEAD', 1)
    const mid = body('MID', 2)
    const tail = { ...body('TAIL', 3), IsFinal: true }
    const { result, rerender } = renderHook(
      ({ chunkedData, resetKey }: { chunkedData: RandomChunkedResponse[]; resetKey?: string }) =>
        useChunkAutoScrollToBottom({
          chunkedData,
          id: 'long-stream',
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
    rerender({ chunkedData: [head, mid], resetKey: 'HTTP/1.1 200' })
    await waitFor(() => expect(edits.join('')).toBe('HEADMID'), { timeout: 2500 })

    // 超过上限后数组只剩尾段，基座仍是响应头。前段留在编辑器里，只补新的一段。
    rerender({ chunkedData: [mid, tail], resetKey: 'HTTP/1.1 200' })
    await waitFor(() => expect(edits.join('')).toContain('TAIL'), { timeout: 2500 })
    const shown = edits.join('')
    expect(shown.startsWith('HEAD')).toBe(true)
    expect(shown.split('TAIL')).toHaveLength(2)
    expect(shown.split('MID')).toHaveLength(2)
  })
})

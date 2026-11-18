import { act, cleanup, renderHook } from '@testing-library/react'
import type { editor, IRange } from 'monaco-editor'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useHiddenHTTPHeaders } from '../useHiddenHTTPHeaders'

function createEditor(packet: string) {
  let value = packet
  const listeners = {
    content: new Set<() => void>(),
    model: new Set<() => void>(),
    dispose: new Set<() => void>(),
    find: new Set<() => void>(),
  }
  const event = (key: keyof typeof listeners) => (callback: () => void) => {
    listeners[key].add(callback)
    return { dispose: () => listeners[key].delete(callback) }
  }
  const emit = (key: keyof typeof listeners) => listeners[key].forEach((listener) => listener())
  const model = {
    getLineCount: () => value.split('\n').length,
    getLineContent: (line: number) => value.split('\n')[line - 1],
  }
  const findState = { isRevealed: false, currentMatch: null as IRange | null, onFindReplaceStateChange: event('find') }
  const instance = {
    getModel: () => model,
    getContribution: () => ({ getState: () => findState }),
    setHiddenAreas: vi.fn(),
    onDidChangeModelContent: event('content'),
    onDidChangeModel: event('model'),
    onDidDispose: event('dispose'),
  }
  return {
    editor: instance as unknown as editor.IStandaloneCodeEditor,
    hiddenAreas: instance.setHiddenAreas,
    listeners,
    search: (line: number | null, isRevealed = true) => {
      findState.isRevealed = isRevealed
      findState.currentMatch =
        line === null ? null : { startLineNumber: line, startColumn: 1, endLineNumber: line, endColumn: 7 }
      emit('find')
    },
    getValue: () => value,
    change: (packet: string, key: 'content' | 'model' = 'content') => {
      value = packet
      emit(key)
    },
    dispose: () => emit('dispose'),
  }
}

afterEach(cleanup)

describe('useHiddenHTTPHeaders', () => {
  it.each([false, true])('reveals a hidden search match without changing the document (response=%s)', (isResponse) => {
    const packet = isResponse ? 'HTTP/1.1 200 OK\nServer: example\n\nbody' : 'GET / HTTP/1.1\nAccept: */*\n\nbody'
    const instance = createEditor(packet)
    const onDocumentChange = vi.fn()
    const onSearchReveal = vi.fn()
    const hook = renderHook(() =>
      useHiddenHTTPHeaders(instance.editor, true, isResponse, undefined, onDocumentChange, onSearchReveal),
    )
    instance.hiddenAreas.mockClear()
    act(() => instance.search(4))
    act(() => instance.search(null))
    act(() => instance.search(2, false))
    expect(instance.hiddenAreas).not.toHaveBeenCalled()
    act(() => instance.search(2))
    expect(instance.hiddenAreas).toHaveBeenCalledExactlyOnceWith([], expect.any(Object))
    expect(onSearchReveal).toHaveBeenCalledOnce()
    expect(onDocumentChange).not.toHaveBeenCalled()
    expect(instance.getValue()).toBe(packet)
    act(() => instance.search(null, false))
    hook.rerender()
    expect(instance.hiddenAreas).toHaveBeenCalledTimes(1)
    hook.unmount()
    expect(instance.listeners.find.size).toBe(0)
  })

  it('keeps an existing search match visible when the hidden areas are first applied', () => {
    const instance = createEditor('GET / HTTP/1.1\nAccept: */*\n\nbody')
    instance.search(2)
    const onSearchReveal = vi.fn()
    renderHook(() => useHiddenHTTPHeaders(instance.editor, true, false, undefined, undefined, onSearchReveal))
    expect(instance.hiddenAreas).toHaveBeenLastCalledWith([], expect.any(Object))
    expect(onSearchReveal).toHaveBeenCalledOnce()
  })

  it.each(['content', 'model'] as const)(
    'initial load stays hidden; subsequent %s changes reveal instead of refolding',
    (event) => {
      const instance = createEditor('GET / HTTP/1.1\nAccept: */*\n\nbody')
      const onDocumentChange = vi.fn()
      renderHook(() => useHiddenHTTPHeaders(instance.editor, true, false, undefined, onDocumentChange))
      expect(onDocumentChange).not.toHaveBeenCalled()
      expect(instance.hiddenAreas.mock.lastCall?.[0]).toHaveLength(1)
      instance.hiddenAreas.mockClear()
      act(() => instance.change('GET / HTTP/1.1\nAccept: text/plain\n\nchanged', event))
      expect(instance.hiddenAreas).toHaveBeenCalledExactlyOnceWith([], expect.any(Object))
      expect(onDocumentChange).toHaveBeenCalledOnce()
      act(() => instance.change('GET / HTTP/1.1\nAccept: */*\n\nbody'))
      expect(instance.hiddenAreas).toHaveBeenCalledTimes(1)
    },
  )

  it('reuses one hidden-area source across toggles and edited lists', () => {
    const instance = createEditor('GET / HTTP/1.1\nAccept: */*\nHost: example.com\n\n')
    const hook = renderHook(({ enabled, headers }) => useHiddenHTTPHeaders(instance.editor, enabled, false, headers), {
      initialProps: { enabled: true, headers: ['accept'] },
    })
    hook.rerender({ enabled: false, headers: ['accept'] })
    hook.rerender({ enabled: true, headers: ['host'] })
    hook.rerender({ enabled: true, headers: [] })
    expect(new Set(instance.hiddenAreas.mock.calls.map(([, source]) => source)).size).toBe(1)
  })

  it('reapplies edited lists immediately without replacing packet content', () => {
    const packet = 'GET / HTTP/1.1\nAccept: */*\nX-Custom: value\n\nbody'
    const instance = createEditor(packet)
    const hook = renderHook(({ headers }) => useHiddenHTTPHeaders(instance.editor, true, false, headers), {
      initialProps: { headers: ['accept'] },
    })
    hook.rerender({ headers: ['x-custom'] })
    expect(instance.hiddenAreas).toHaveBeenLastCalledWith(
      [{ startLineNumber: 3, startColumn: 1, endLineNumber: 3, endColumn: 1 }],
      expect.any(Object),
    )
    hook.rerender({ headers: [] })
    expect(instance.hiddenAreas).toHaveBeenLastCalledWith([], expect.any(Object))
    expect(instance.getValue()).toBe(packet)
  })
  it('preserves the packet, updates after edits/model replacement, and clears only its own ranges', () => {
    const packet = 'GET / HTTP/1.1\nAccept: */*\nHost: example.com\n\nbody'
    const instance = createEditor(packet)
    const hook = renderHook(({ enabled }) => useHiddenHTTPHeaders(instance.editor, enabled, false), {
      initialProps: { enabled: false },
    })
    expect(instance.hiddenAreas).not.toHaveBeenCalled()
    hook.rerender({ enabled: true })
    const source = instance.hiddenAreas.mock.calls[0][1]
    expect(instance.hiddenAreas).toHaveBeenLastCalledWith(
      [{ startLineNumber: 2, startColumn: 1, endLineNumber: 2, endColumn: 1 }],
      source,
    )
    expect(instance.getValue()).toBe(packet)

    act(() => instance.change('GET / HTTP/1.1\nHost: example.com\nAccept: */*\n\nbody'))
    expect(instance.hiddenAreas).toHaveBeenLastCalledWith(
      [{ startLineNumber: 3, startColumn: 1, endLineNumber: 3, endColumn: 1 }],
      source,
    )
    act(() => instance.change('GET / HTTP/1.1\nHost: example.com\n\nAccept: body', 'model'))
    expect(instance.hiddenAreas).toHaveBeenLastCalledWith([], source)
    hook.rerender({ enabled: false })
    expect(instance.hiddenAreas).toHaveBeenLastCalledWith([], source)
    expect(instance.listeners.content.size).toBe(0)
    expect(instance.listeners.model.size).toBe(0)
    expect(instance.listeners.dispose.size).toBe(0)
  })

  it('handles editor disposal and remounting when switching views', () => {
    const packet = 'HTTP/1.1 200 OK\nServer: example\n\nbody'
    const first = createEditor(packet)
    const hook = renderHook(({ instance }) => useHiddenHTTPHeaders(instance.editor, true, true), {
      initialProps: { instance: first },
    })
    first.hiddenAreas.mockClear()
    act(() => first.dispose())
    const second = createEditor(packet)
    hook.rerender({ instance: second })
    expect(first.hiddenAreas).not.toHaveBeenCalled()
    expect(first.listeners.content.size).toBe(0)
    expect(second.hiddenAreas).toHaveBeenCalledTimes(1)
    const source = second.hiddenAreas.mock.calls[0][1]
    hook.unmount()
    expect(second.hiddenAreas).toHaveBeenLastCalledWith([], source)
  })
})

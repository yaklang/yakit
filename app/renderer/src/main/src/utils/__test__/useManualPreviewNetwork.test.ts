import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useManualPreviewNetwork } from '../useManualPreviewNetwork'

const original = { body: 'response', packet: new Uint8Array([1]), url: 'https://target.test', id: 'response-a' }

describe('manual preview network grant', () => {
  it('does not authorize restored render mode, and consumes a manual click once', () => {
    const getNetwork = vi.fn(() => ({ Proxy: 'http://proxy:8080' }))
    const { result, rerender } = renderHook(() => useManualPreviewNetwork(original, getNetwork))
    expect(result.current.consume()).toBeUndefined()
    rerender()
    expect(getNetwork).not.toHaveBeenCalled()
    act(() => result.current.onRenderClick(true))
    expect(result.current.consume()).toEqual({ Proxy: 'http://proxy:8080' })
    expect(result.current.consume()).toBeUndefined()
  })

  it.each(['body', 'packet', 'url', 'id'] as const)(
    'revokes the click when response %s changes, even after returning to it',
    (field) => {
      const { result, rerender } = renderHook(({ snapshot }) => useManualPreviewNetwork(snapshot, () => ({})), {
        initialProps: { snapshot: original },
      })
      act(() => result.current.onRenderClick(true))
      rerender({ snapshot: { ...original, [field]: field === 'packet' ? new Uint8Array([2]) : 'changed' } })
      expect(result.current.consume()).toBeUndefined()
      rerender({ snapshot: original })
      expect(result.current.consume()).toBeUndefined()
    },
  )

  it('preserves a click when an encoded view rebuilds the same response bytes', () => {
    const { result, rerender } = renderHook(({ snapshot }) => useManualPreviewNetwork(snapshot, () => ({})), {
      initialProps: { snapshot: original },
    })
    act(() => result.current.onRenderClick(true))
    rerender({ snapshot: { ...original, packet: new Uint8Array([1]) } })
    expect(result.current.consume()).toEqual({})
  })

  it('keeps other modules offline and clears the grant on leaving render', () => {
    const offline = renderHook(() => useManualPreviewNetwork(original))
    act(() => offline.result.current.onRenderClick(true))
    expect(offline.result.current.consume()).toBeUndefined()
    const online = renderHook(() => useManualPreviewNetwork(original, () => ({})))
    act(() => online.result.current.onRenderClick(true))
    act(() => online.result.current.onRenderClick(false))
    expect(online.result.current.consume()).toBeUndefined()
  })
})

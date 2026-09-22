import './setupElectron'
import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useChatIPC } from '../useChatIPC'
import { globalSessionEngine } from '../ChatMultiSessionController'
import { YakitRoute } from '@/enums/yakitRoute'

vi.mock('../ChatMultiSessionController', () => ({
  globalSessionEngine: {
    handleStartSession: vi.fn(),
    cancelPendingConnection: vi.fn(),
    onPageUnload: vi.fn(),
  },
}))

describe('pending chat lifecycle', () => {
  beforeEach(() => vi.resetAllMocks())
  afterEach(cleanup)
  it('publishes pending state immediately, prevents double submission and clears it on success', () => {
    let callbacks: any
    vi.mocked(globalSessionEngine.handleStartSession).mockImplementation((_input, cb) => {
      callbacks = cb
      cb?.onPendingChange?.({ streamToken: 'transport', data: {} as any, status: 'connecting' })
      cb?.onLinkStart?.('transport')
      return 'transport'
    })
    const { result } = renderHook(() => useChatIPC(YakitRoute.AI_Agent, 'page'))
    const onLinkSuccess = vi.fn()
    act(() => {
      result.current.onStart({ kind: 'new', params: {}, onLinkSuccess })
      result.current.onStart({ kind: 'new', params: {} })
    })
    expect(result.current.pendingChat?.streamToken).toBe('transport')
    act(() => {
      result.current.onStart({ kind: 'new', params: {} })
    })
    expect(globalSessionEngine.handleStartSession).toHaveBeenCalledTimes(1)
    act(() => callbacks.onLinkSuccess('backend-id'))
    expect(onLinkSuccess).toHaveBeenCalledWith('backend-id')
    expect(result.current.pendingChat).toBeUndefined()
  })
  it('cancels pending work without accepting its subsequent pending callback', () => {
    let callbacks: any
    vi.mocked(globalSessionEngine.handleStartSession).mockImplementation((_input, cb) => {
      callbacks = cb
      cb?.onPendingChange?.({ streamToken: 'transport', data: {} as any, status: 'connecting' })
      return 'transport'
    })
    const { result } = renderHook(() => useChatIPC(YakitRoute.AI_Agent, 'page'))
    act(() => {
      result.current.onStart({ kind: 'new', params: {} })
    })
    act(() => result.current.cancelPendingChat())
    act(() => callbacks.onPendingChange({ streamToken: 'transport', data: {}, status: 'failed' }))
    expect(globalSessionEngine.cancelPendingConnection).toHaveBeenCalledWith('transport')
    expect(result.current.pendingChat).toBeUndefined()
  })

  it('keeps a new pending chat when a previous history reconnect finishes', () => {
    const callbacks: any[] = []
    vi.mocked(globalSessionEngine.handleStartSession).mockImplementation((input, cb) => {
      const token = input.kind === 'new' ? 'new-transport' : 'old-transport'
      callbacks.push(cb)
      if (input.kind === 'new') cb?.onPendingChange?.({ streamToken: token, data: {} as any, status: 'connecting' })
      cb?.onLinkStart?.(token)
      return token
    })
    const { result } = renderHook(() => useChatIPC(YakitRoute.AI_Agent, 'page'))
    act(() => {
      result.current.onStart({ kind: 'resume', sessionId: 'history', params: {} })
      result.current.onStart({ kind: 'new', params: {} })
    })
    act(() => callbacks[0].onLinkSuccess('history'))
    expect(result.current.pendingChat?.streamToken).toBe('new-transport')
    act(() => callbacks[1].onLinkSuccess('new-session'))
    expect(result.current.pendingChat).toBeUndefined()
  })

  it('preserves the failed draft when retrying and delegates unmount cleanup to the controller', () => {
    const callbacks: any[] = []
    vi.mocked(globalSessionEngine.handleStartSession).mockImplementation((_input, cb) => {
      const token = `transport-${callbacks.length}`
      callbacks.push(cb)
      cb?.onPendingChange?.({ streamToken: token, data: {} as any, status: 'connecting' })
      cb?.onLinkStart?.(token)
      return token
    })
    const { result, unmount } = renderHook(() => useChatIPC(YakitRoute.AI_Agent, 'page'))
    act(() => result.current.onStart({ kind: 'new', draftId: 'draft', params: {} }))
    act(() => callbacks[0].onPendingChange({ streamToken: 'transport-0', data: {}, status: 'failed' }))
    act(() => result.current.onStart({ kind: 'new', draftId: 'draft', params: {} }))
    expect(globalSessionEngine.cancelPendingConnection).toHaveBeenCalledWith('transport-0', { keepDraft: true })
    expect(result.current.pendingChat?.streamToken).toBe('transport-1')
    unmount()
    expect(globalSessionEngine.cancelPendingConnection).toHaveBeenCalledWith('transport-1')
  })
})

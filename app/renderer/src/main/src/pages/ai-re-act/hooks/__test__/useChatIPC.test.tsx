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
    expect(onLinkSuccess).toHaveBeenCalledWith('backend-id', true)
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
    act(() => result.current.pendingChat?.retry?.())
    expect(globalSessionEngine.cancelPendingConnection).toHaveBeenCalledWith('transport-0', { keepDraft: true })
    expect(result.current.pendingChat?.streamToken).toBe('transport-1')
    unmount()
    expect(globalSessionEngine.cancelPendingConnection).toHaveBeenCalledWith('transport-1')
  })
})

describe('Agent independent connections', () => {
  const callbacks: any[] = []
  beforeEach(() => {
    vi.resetAllMocks()
    callbacks.length = 0
    vi.mocked(globalSessionEngine.handleStartSession).mockImplementation((input, cb) => {
      const token = `transport-${callbacks.length}`
      callbacks.push(cb)
      if (input.kind === 'new') cb?.onPendingChange?.({ streamToken: token, data: {} as any, status: 'connecting' })
      cb?.onLinkStart?.(token)
      return token
    })
  })
  afterEach(cleanup)

  it('allows history recovery during a new handshake without cancelling either connection', () => {
    const { result } = renderHook(() => useChatIPC(YakitRoute.AI_Agent, 'page', true))
    act(() => result.current.onStart({ kind: 'new', params: {} }))
    act(() => result.current.onStart({ kind: 'resume', sessionId: 'history', params: {} }))
    expect(globalSessionEngine.handleStartSession).toHaveBeenCalledTimes(2)
    expect(globalSessionEngine.cancelPendingConnection).not.toHaveBeenCalled()
    expect(result.current.pendingChat?.streamToken).toBe('transport-0')
    act(() => callbacks[1].onLinkSuccess('history'))
    expect(result.current.pendingChat?.streamToken).toBe('transport-0')
  })

  it('retains two new connections across view changes and does not focus a background completion', () => {
    const { result } = renderHook(() => useChatIPC(YakitRoute.AI_Agent, 'page', true))
    const firstBound = vi.fn()
    const secondBound = vi.fn()
    act(() => result.current.onStart({ kind: 'new', params: {}, onLinkSuccess: firstBound }))
    act(() => result.current.detachPendingChat())
    act(() => result.current.onStart({ kind: 'new', params: {}, onLinkSuccess: secondBound }))
    act(() => callbacks[0].onLinkSuccess('first'))
    expect(firstBound).toHaveBeenCalledWith('first', false)
    expect(result.current.pendingChat?.streamToken).toBe('transport-1')
    act(() => callbacks[1].onLinkSuccess('second'))
    expect(secondBound).toHaveBeenCalledWith('second', true)
    expect(result.current.pendingChat).toBeUndefined()
    expect(globalSessionEngine.cancelPendingConnection).not.toHaveBeenCalled()
  })

  it('ignores background failure for the current view and still cleans up all page connections on unmount', () => {
    const { result, unmount } = renderHook(() => useChatIPC(YakitRoute.AI_Agent, 'page', true))
    act(() => result.current.onStart({ kind: 'new', params: {} }))
    act(() => result.current.detachPendingChat())
    act(() => callbacks[0].onPendingChange({ streamToken: 'transport-0', status: 'failed', data: {} }))
    expect(result.current.pendingChat).toBeUndefined()
    expect(globalSessionEngine.cancelPendingConnection).not.toHaveBeenCalled()
    unmount()
    expect(globalSessionEngine.onPageUnload).toHaveBeenCalledWith(YakitRoute.AI_Agent, 'page')
  })

  it('still rejects duplicate submissions in the current view and supports explicit cancellation', () => {
    const { result } = renderHook(() => useChatIPC(YakitRoute.AI_Agent, 'page', true))
    act(() => {
      result.current.onStart({ kind: 'new', params: {} })
      result.current.onStart({ kind: 'new', params: {} })
    })
    expect(globalSessionEngine.handleStartSession).toHaveBeenCalledTimes(1)
    act(() => result.current.cancelPendingChat())
    expect(globalSessionEngine.cancelPendingConnection).toHaveBeenCalledWith('transport-0')
  })

  it('preserves the existing blocking behavior for other entry points', () => {
    const { result } = renderHook(() => useChatIPC(YakitRoute.AI_Agent, 'embedded-page'))
    act(() => {
      result.current.onStart({ kind: 'new', params: {} })
      result.current.onStart({ kind: 'resume', sessionId: 'history', params: {} })
    })
    expect(globalSessionEngine.handleStartSession).toHaveBeenCalledTimes(1)
  })
})

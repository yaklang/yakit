import './setupElectron'
import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useChatIPC } from '../useChatIPC'
import { globalSessionEngine } from '../ChatMultiSessionController'
import { YakitRoute } from '@/enums/yakitRoute'
import { ipcRendererMock, resetIpcMocks } from './setupElectron'

vi.mock('@/utils/notification', () => ({ yakitNotify: vi.fn() }))
vi.mock('../ChatMultiSessionController', () => ({
  globalSessionEngine: {
    isSessionReady: vi.fn(),
    ensureSession: vi.fn(),
    handleStartSession: vi.fn(),
    handleGrpcOutputEvent: vi.fn(),
    handleSessionError: vi.fn(),
    handleSessionEnd: vi.fn(),
    onPageUnload: vi.fn(),
  },
}))

describe('useChatIPC connection identity', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    resetIpcMocks()
  })
  afterEach(cleanup)

  it('ignores queued callbacks from the previous connection even when the session id is reused', () => {
    let ready = false
    let meta = {}
    vi.mocked(globalSessionEngine.isSessionReady).mockImplementation(() => ready)
    vi.mocked(globalSessionEngine.ensureSession).mockImplementation(() => ({ meta }) as any)
    vi.mocked(globalSessionEngine.handleStartSession).mockImplementation(() => {
      ready = true
      meta = {}
      return true
    })
    const { result } = renderHook(() => useChatIPC(YakitRoute.AI_Agent, 'page'))
    const params = { token: 'same', params: {} } as any
    act(() => result.current.onStart(params))
    const oldCallbacks = ipcRendererMock.on.mock.calls.map(([, callback]) => callback)
    ready = false
    act(() => result.current.onStart(params))
    for (const callback of oldCallbacks) callback({}, {})
    expect(globalSessionEngine.handleGrpcOutputEvent).not.toHaveBeenCalled()
    expect(globalSessionEngine.handleSessionError).not.toHaveBeenCalled()
    expect(globalSessionEngine.handleSessionEnd).not.toHaveBeenCalled()
    const currentData = ipcRendererMock.on.mock.calls.at(-3)![1]
    currentData({}, { Type: 'pong' })
    expect(globalSessionEngine.handleGrpcOutputEvent).toHaveBeenCalledWith('same', { Type: 'pong' })
  })

  it('removes the new listeners when the controller rejects a connection during deletion', () => {
    vi.mocked(globalSessionEngine.isSessionReady).mockReturnValue(false)
    vi.mocked(globalSessionEngine.handleStartSession).mockReturnValue(false)
    const { result } = renderHook(() => useChatIPC(YakitRoute.AI_Agent, 'page'))
    act(() => result.current.onStart({ token: 'deleting', params: {} } as any))
    expect(ipcRendererMock.removeAllListeners.mock.calls.slice(-3)).toEqual([
      ['deleting-data'],
      ['deleting-error'],
      ['deleting-end'],
    ])
    expect(globalSessionEngine.ensureSession).not.toHaveBeenCalled()
  })
})

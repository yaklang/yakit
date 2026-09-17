import { act, renderHook, cleanup } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { GrpcOutput, StreamOptions } from '@/services/ipc'
const mocks = vi.hoisted(() => ({ openStream: vi.fn(), notify: vi.fn() }))
vi.mock('@/services/ipc', async () => ({
  ipc: { openStream: mocks.openStream },
  BridgeError: class BridgeError extends Error {},
}))
vi.mock('@/utils/kv', () => ({ getRemoteValue: vi.fn().mockResolvedValue(undefined) }))
vi.mock('@/utils/notification', () => ({ info: mocks.notify, yakitFailed: mocks.notify }))
vi.mock('../constant', () => ({ DefaultTabs: () => [] }))
import useHoldGRPCStream from '../useHoldGRPCStream'
const output = (text: string): GrpcOutput<'DebugPlugin'> => ({
  Hash: '',
  OutputJson: '',
  Raw: new Uint8Array(),
  IsMessage: true,
  Message: new TextEncoder().encode(
    JSON.stringify({ type: 'log', content: { level: 'info', data: text, timestamp: 1 } }),
  ),
  Id: '9223372036854775807',
  RuntimeID: 'runtime',
  Progress: 0,
  PluginName: '',
})

describe('SDK stream hook lifecycle', () => {
  beforeEach(() => vi.clearAllMocks())
  afterEach(cleanup)

  it('ignores a stale async consumer after cancellation and token reuse', async () => {
    const options: StreamOptions<GrpcOutput<'DebugPlugin'>>[] = []
    const handles: { cancel: ReturnType<typeof vi.fn> }[] = []
    mocks.openStream.mockImplementation((_namespace, _api, _params, value) => {
      options.push(value)
      const handle = { cancel: vi.fn().mockResolvedValue(undefined) }
      handles.push(handle)
      return Promise.resolve(handle)
    })
    let release!: () => void
    const consume = vi.fn().mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          release = resolve
        }),
    )
    const { result } = renderHook(() =>
      useHoldGRPCStream({ apiKey: 'DebugPlugin', taskName: 'test', token: 'same-token', onData: consume }),
    )
    await act(async () => result.current[1].open({}))
    const stale = options[0].onData!(output('old'))
    await act(async () => {
      await result.current[1].cancel()
      await result.current[1].open({})
      release()
      await stale
      await options[1].onData!(output('new'))
    })
    expect(options[0].signal?.aborted).toBe(true)
    expect(handles[0].cancel).toHaveBeenCalled()
    expect(result.current[1].snapshot().logState.map((row) => row.data)).toEqual(['new'])
  })

  it('does not become active again when the stream ends before opening resolves', async () => {
    let options!: StreamOptions<GrpcOutput<'DebugPlugin'>>
    let resolveOpen!: (value: { cancel(): Promise<void> }) => void
    mocks.openStream.mockImplementation((_namespace, _api, _params, value) => {
      options = value
      return new Promise((resolve) => {
        resolveOpen = resolve
      })
    })
    const onEnd = vi.fn()
    const { result } = renderHook(() =>
      useHoldGRPCStream({ apiKey: 'DebugPlugin', taskName: 'test', token: 'early-end', onEnd }),
    )
    let opening!: Promise<void>
    await act(async () => {
      opening = result.current[1].open({})
    })
    await act(async () => {
      options.onEnd!()
      resolveOpen({ cancel: vi.fn().mockResolvedValue(undefined) })
      await opening
      result.current[1].start()
    })
    expect(result.current[1].isActive()).toBe(false)
    expect(onEnd).toHaveBeenCalledOnce()
  })

  it('aborts its current stream on unmount', async () => {
    let options!: StreamOptions<GrpcOutput<'DebugPlugin'>>
    mocks.openStream.mockImplementation((_namespace, _api, _params, value) => {
      options = value
      return Promise.resolve({ cancel: vi.fn().mockResolvedValue(undefined) })
    })
    const { result, unmount } = renderHook(() =>
      useHoldGRPCStream({ apiKey: 'DebugPlugin', taskName: 'test', token: 'unmount' }),
    )
    await act(async () => result.current[1].open({}))
    unmount()
    expect(options.signal?.aborted).toBe(true)
  })
})

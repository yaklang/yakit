import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useSyntaxFlowSession } from '../../pages/yakRunnerCodeScan/useSyntaxFlowSession'

const sdk = vi.hoisted(() => ({ openStream: vi.fn() }))
vi.mock('@/services/ipc', () => ({ ipc: sdk }))
beforeEach(() => {
  sdk.openStream.mockReset()
})
const task = () => ({
  token: 'scan',
  instanceId: 'instance',
  write: vi.fn().mockResolvedValue(undefined),
  cancel: vi.fn().mockResolvedValue(undefined),
})
const options = () => ({ token: 'scan', onData: vi.fn(), onError: vi.fn(), onEnd: vi.fn() })

describe('SyntaxFlow duplex session ownership', () => {
  it('queues control writes behind opening and shares one instance', async () => {
    const stream = task()
    let finishOpen!: (value: typeof stream) => void
    sdk.openStream.mockImplementation(
      () =>
        new Promise((resolve) => {
          finishOpen = resolve
        }),
    )
    const { result, unmount } = renderHook(() => useSyntaxFlowSession(options()))
    let start!: Promise<boolean>
    let pause!: Promise<boolean>
    act(() => {
      start = result.current.send({ ControlMode: 'start' })
      pause = result.current.send({ ControlMode: 'pause' })
    })
    expect(sdk.openStream).toHaveBeenCalledOnce()
    expect(stream.write).not.toHaveBeenCalled()
    await act(async () => {
      finishOpen(stream)
      await Promise.all([start, pause])
    })
    expect(stream.write).toHaveBeenCalledWith({ ControlMode: 'pause' })
    unmount()
    expect(sdk.openStream.mock.calls[0][3].signal.aborted).toBe(true)
  })

  it('handles data and completion before open resolves without resurrecting the stream', async () => {
    const callbacks = options()
    sdk.openStream.mockImplementation(async (_namespace, _api, _params, streamOptions) => {
      streamOptions.onData({ Status: 'done' })
      streamOptions.onEnd()
      return task()
    })
    const { result } = renderHook(() => useSyntaxFlowSession(callbacks))
    await act(async () => {
      expect(await result.current.send({ ControlMode: 'start' })).toBe(false)
    })
    expect(callbacks.onData).toHaveBeenCalledWith({ Status: 'done' })
    expect(callbacks.onEnd).toHaveBeenCalledOnce()
    await act(async () => {
      await result.current.send({ ControlMode: 'start' })
    })
    expect(sdk.openStream).toHaveBeenCalledTimes(2)
  })

  it('ignores late callbacks and an opening failure from a cancelled instance', async () => {
    const callbacks = options()
    let rejectOpen!: (error: Error) => void
    sdk.openStream.mockImplementationOnce(
      () =>
        new Promise((_resolve, reject) => {
          rejectOpen = reject
        }),
    )
    sdk.openStream.mockResolvedValue(task())
    const { result } = renderHook(() => useSyntaxFlowSession(callbacks))
    let old!: Promise<boolean>
    act(() => {
      old = result.current.send({ ControlMode: 'start' })
    })
    const caught = old.catch(() => false)
    const previous = sdk.openStream.mock.calls[0][3]
    await act(async () => {
      await result.current.cancel()
      await result.current.send({ ControlMode: 'start' })
      previous.onData({ Status: 'done' })
      previous.onError(new Error('old'))
      rejectOpen(new Error('aborted'))
      await caught
    })
    expect(previous.signal.aborted).toBe(true)
    expect(callbacks.onData).not.toHaveBeenCalled()
    expect(callbacks.onError).not.toHaveBeenCalled()
  })
})

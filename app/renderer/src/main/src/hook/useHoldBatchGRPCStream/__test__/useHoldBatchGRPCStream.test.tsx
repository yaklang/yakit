import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ openStream: vi.fn(), notify: vi.fn() }))
vi.mock('@/services/ipc', () => ({
  ipc: { openStream: mocks.openStream },
  BridgeError: class BridgeError extends Error {},
}))
vi.mock('@/utils/kv', () => ({ getRemoteValue: vi.fn().mockResolvedValue(undefined) }))
vi.mock('@/utils/notification', () => ({ info: mocks.notify, failed: mocks.notify, yakitFailed: mocks.notify }))
vi.mock('../../useHoldGRPCStream/constant', () => ({ DefaultTabs: () => [] }))
import useHoldBatchGRPCStream from '../useHoldBatchGRPCStream'

describe('HybridScan duplex commands', () => {
  beforeEach(() => vi.clearAllMocks())
  afterEach(cleanup)
  it('waits for initialization before sending configuration and waits for that write', async () => {
    let opened!: (value: unknown) => void
    let written!: () => void
    const write = vi.fn().mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          written = resolve
        }),
    )
    mocks.openStream.mockImplementation(
      () =>
        new Promise((resolve) => {
          opened = resolve
        }),
    )
    const { result } = renderHook(() =>
      useHoldBatchGRPCStream({ taskName: 'test', apiKey: 'HybridScan', token: 'scan' }),
    )
    let start!: Promise<void>
    let done = false
    await act(async () => {
      start = result.current[1].startTask({ Concurrent: 2 }).then(() => {
        done = true
      })
    })
    expect(mocks.openStream).toHaveBeenCalledWith(
      'grpc',
      'HybridScan',
      expect.objectContaining({ Control: true, HybridScanMode: 'new' }),
      expect.any(Object),
    )
    expect(write).not.toHaveBeenCalled()
    await act(async () => {
      opened({ write, cancel: vi.fn().mockResolvedValue(undefined) })
    })
    expect(write).toHaveBeenCalledWith({ Concurrent: 2 })
    expect(done).toBe(false)
    await act(async () => {
      written()
      await start
    })
    expect(done).toBe(true)
  })
  it('pauses on the current instance and opens a fresh instance when resuming after cancellation', async () => {
    const write = vi.fn().mockResolvedValue(undefined)
    mocks.openStream.mockResolvedValue({ write, cancel: vi.fn().mockResolvedValue(undefined) })
    const { result } = renderHook(() =>
      useHoldBatchGRPCStream({ taskName: 'test', apiKey: 'HybridScan', token: 'same' }),
    )
    await act(async () => {
      await result.current[1].startTask({})
      await result.current[1].setMode('runtime', 'pause')
    })
    expect(write).toHaveBeenLastCalledWith({ Control: false, HybridScanMode: 'pause', ResumeTaskId: 'runtime' })
    expect(mocks.openStream).toHaveBeenCalledOnce()
    await act(async () => {
      await result.current[1].cancel()
      await result.current[1].setMode('runtime', 'resume')
    })
    expect(mocks.openStream).toHaveBeenCalledTimes(2)
    expect(mocks.openStream.mock.calls[1][2]).toEqual({
      Control: true,
      HybridScanMode: 'resume',
      ResumeTaskId: 'runtime',
    })
    expect(mocks.openStream.mock.calls[0][3].signal.aborted).toBe(true)
  })
  it('rejects a failed configuration write rather than reporting successful startup', async () => {
    const error = new Error('write failed')
    mocks.openStream.mockResolvedValue({
      write: vi.fn().mockRejectedValue(error),
      cancel: vi.fn().mockResolvedValue(undefined),
    })
    const { result } = renderHook(() =>
      useHoldBatchGRPCStream({ taskName: 'test', apiKey: 'HybridScan', token: 'failed' }),
    )
    await act(async () => {
      await expect(result.current[1].startTask({})).rejects.toBe(error)
    })
    expect(mocks.notify).not.toHaveBeenCalledWith('发送扫描目标与插件成功')
  })
})

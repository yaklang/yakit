import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ open: vi.fn(), failed: vi.fn() }))
vi.mock('@/services/ipc', () => ({ ipc: { openStream: mocks.open } }))
vi.mock('../../utils/xtermUtils', () => ({ writeExecResultXTerm: vi.fn() }))
vi.mock('../../utils/notification', () => ({ failed: mocks.failed, info: vi.fn() }))
vi.mock('@/utils/envfile', () => ({ isEnpriTraceAgent: () => false }))
vi.mock('@/utils/tool', () => ({ JSONParseLog: (value: string) => JSON.parse(value) }))
import useHoldingIPCRStream from '../useHoldingIPCRStream'
const result = (text: string) => ({
  IsMessage: true,
  Message: Buffer.from(JSON.stringify({ type: 'log', content: { level: 'info', data: text, timestamp: 1 } })),
  Raw: new Uint8Array(),
  RuntimeID: 'runtime',
})
beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers()
})
afterEach(() => {
  vi.useRealTimers()
})
describe('holding execution stream', () => {
  it('keeps first data and completion emitted before the opening reply', async () => {
    mocks.open.mockImplementation(async (_namespace, _api, _params, options) => {
      await options.onData(result('first'))
      options.onEnd()
      return { cancel: vi.fn() }
    })
    const end = vi.fn()
    const hook = renderHook(() => useHoldingIPCRStream('test', 'Exec', 'one', end))
    await act(async () => {
      await hook.result.current[1].open({ Script: '' })
    })
    expect(end).toHaveBeenCalledOnce()
    expect(hook.result.current[0].messageState[0].data).toBe('first')
    expect(vi.getTimerCount()).toBe(0)
    hook.unmount()
  })
  it('ignores callbacks from a replaced task and cancels the active task on unmount', async () => {
    const options: { signal: AbortSignal; onData: (data: unknown) => Promise<void>; onEnd: () => void }[] = []
    const cancel = vi.fn(async () => {})
    mocks.open.mockImplementation(async (_namespace, _api, _params, value) => {
      options.push(value)
      return { cancel }
    })
    const hook = renderHook(() => useHoldingIPCRStream('test', 'Exec', 'same'))
    await act(async () => {
      await hook.result.current[1].open({ Script: 'first' })
    })
    await act(async () => {
      await hook.result.current[1].open({ Script: 'second' })
    })
    expect(options[0].signal.aborted).toBe(true)
    await act(async () => {
      await options[0].onData(result('stale'))
      options[0].onEnd()
      await options[1].onData(result('current'))
      await vi.advanceTimersByTimeAsync(500)
    })
    expect(hook.result.current[0].messageState.map((item) => item.data)).toEqual(['current'])
    hook.unmount()
    expect(options[1].signal.aborted).toBe(true)
    expect(vi.getTimerCount()).toBe(0)
  })
})

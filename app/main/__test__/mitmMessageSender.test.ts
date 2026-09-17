// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMessageSender } from '../services/mitmSender'
import type { GrpcClient } from '../ipc/grpc'
vi.mock('../logFile', () => ({ engineLogOutputFile: vi.fn(), getFormattedDateTime: () => '' }))
const fixture = () => {
  const callbacks: ((error?: Error | null) => void)[] = []
  const stream = {
    write: vi.fn((_message, callback) => {
      callbacks.push(callback)
      return true
    }),
    cancel: vi.fn(),
  }
  return { stream, callbacks, typed: stream as unknown as ReturnType<GrpcClient['MITMV2']> }
}
beforeEach(() => {
  vi.useFakeTimers()
})
afterEach(() => {
  vi.useRealTimers()
})
describe('MITM paced sender', () => {
  it('waits for the write callback and a 20 ms gap before sending the next frame', async () => {
    const { stream, callbacks, typed } = fixture()
    const sender = createMessageSender(typed)
    const first = sender.sendAndWait({ RecoverContext: true })
    const second = sender.sendAndWait({ RecoverManualHijack: true })
    expect(stream.write).toHaveBeenCalledOnce()
    callbacks[0]()
    await first
    await vi.advanceTimersByTimeAsync(19)
    expect(stream.write).toHaveBeenCalledOnce()
    await vi.advanceTimersByTimeAsync(1)
    expect(stream.write).toHaveBeenCalledTimes(2)
    callbacks[1]()
    await second
    sender.destroy()
    await vi.runAllTimersAsync()
  })
  it('bounds pending frames and releases all waiters and timers on cancellation', async () => {
    const { stream, typed } = fixture()
    const sender = createMessageSender(typed, { maxPendingWrites: 2 })
    const pending = Promise.allSettled([sender.sendAndWait({}), sender.sendAndWait({})])
    await expect(sender.sendAndWait({})).rejects.toMatchObject({ code: 'RESOURCE_EXHAUSTED' })
    sender.destroy()
    expect((await pending).map((result) => result.status)).toEqual(['rejected', 'rejected'])
    await vi.advanceTimersByTimeAsync(20)
    expect(vi.getTimerCount()).toBe(0)
    expect(stream.cancel).toHaveBeenCalledOnce()
    expect(stream.write).toHaveBeenCalledOnce()
  })
})

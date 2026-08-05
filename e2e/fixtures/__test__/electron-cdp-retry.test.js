import { describe, expect, it, vi } from 'vitest'

import { isTransientElectronCDPError, runIdempotentElectronCDPCommand } from '../electron/electron-cdp-retry.mjs'

describe('Electron CDP idempotent retry', () => {
  it('returns the first successful result without retrying', async () => {
    const command = vi.fn().mockResolvedValue(42)
    const onRetry = vi.fn()

    await expect(runIdempotentElectronCDPCommand(command, { onRetry })).resolves.toBe(42)
    expect(command).toHaveBeenCalledTimes(1)
    expect(onRetry).not.toHaveBeenCalled()
  })

  it('retries Promise was collected exactly once', async () => {
    const transient = new Error('Promise was collected')
    const command = vi.fn().mockRejectedValueOnce(transient).mockResolvedValueOnce('installed')
    const onRetry = vi.fn().mockResolvedValue(undefined)

    await expect(runIdempotentElectronCDPCommand(command, { onRetry })).resolves.toBe('installed')
    expect(command).toHaveBeenCalledTimes(2)
    expect(onRetry).toHaveBeenCalledOnce()
    expect(onRetry).toHaveBeenCalledWith(transient)
  })

  it('retries a temporarily unavailable CDP bridge exactly once', async () => {
    const transient = new Error('CDP bridge is not available, API is disabled')
    const command = vi.fn().mockRejectedValueOnce(transient).mockResolvedValueOnce('attached')

    await expect(runIdempotentElectronCDPCommand(command)).resolves.toBe('attached')
    expect(command).toHaveBeenCalledTimes(2)
    expect(isTransientElectronCDPError(transient)).toBe(true)
  })

  it('does not retry application or assertion errors', async () => {
    const failure = new Error('MITM flow table is not mounted')
    const command = vi.fn().mockRejectedValue(failure)
    const onRetry = vi.fn()

    await expect(runIdempotentElectronCDPCommand(command, { onRetry })).rejects.toBe(failure)
    expect(command).toHaveBeenCalledTimes(1)
    expect(onRetry).not.toHaveBeenCalled()
  })

  it('surfaces the second transient failure instead of looping', async () => {
    const first = new Error('Promise was collected')
    const second = new Error('Promise was collected')
    const command = vi.fn().mockRejectedValueOnce(first).mockRejectedValueOnce(second)

    await expect(runIdempotentElectronCDPCommand(command)).rejects.toBe(second)
    expect(command).toHaveBeenCalledTimes(2)
  })
})

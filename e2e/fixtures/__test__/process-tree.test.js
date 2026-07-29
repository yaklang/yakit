// @vitest-environment node

import { describe, expect, it, vi } from 'vitest'
import { terminateProcessTree } from '../process/process-tree.mjs'

describe('terminateProcessTree', () => {
  it('forwards the exact pid and signal to the tree terminator', async () => {
    const implementation = vi.fn((pid, signal, callback) => callback())

    await expect(terminateProcessTree(1234, 'SIGINT', implementation)).resolves.toBe(true)
    expect(implementation).toHaveBeenCalledWith(1234, 'SIGINT', expect.any(Function))
  })

  it('is cleanup-safe for invalid or already-exited process trees', async () => {
    const implementation = vi.fn()
    await expect(terminateProcessTree(undefined, 'SIGTERM', implementation)).resolves.toBe(false)
    expect(implementation).not.toHaveBeenCalled()

    await expect(
      terminateProcessTree(1234, 'SIGTERM', (_pid, _signal, callback) => callback(new Error('not found'))),
    ).resolves.toBe(false)
  })
})

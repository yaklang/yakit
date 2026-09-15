import { afterEach, describe, expect, it } from 'vitest'
import { consumeMcpWebFuzzerExecution, queueMcpWebFuzzerExecution } from '../webFuzzer'

const pageId = 'mcp-web-fuzzer-tab'

afterEach(() => {
  while (consumeMcpWebFuzzerExecution(pageId)) {
    // The queue is module-local; drain the page used by this test.
  }
})

describe('MCP Web Fuzzer execution queue', () => {
  it('keeps distinct commands in FIFO order', () => {
    const expiresAt = Date.now() + 10_000
    queueMcpWebFuzzerExecution({ executionId: 'first', pageId, expiresAt })
    queueMcpWebFuzzerExecution({ executionId: 'second', pageId, expiresAt })

    expect(consumeMcpWebFuzzerExecution(pageId)?.executionId).toBe('first')
    expect(consumeMcpWebFuzzerExecution(pageId)?.executionId).toBe('second')
    expect(consumeMcpWebFuzzerExecution(pageId)).toBeUndefined()
  })

  it('deduplicates commands and never executes expired commands', () => {
    const expiresAt = Date.now() + 10_000
    queueMcpWebFuzzerExecution({ executionId: 'deduplicated', pageId, expiresAt })
    queueMcpWebFuzzerExecution({ executionId: 'deduplicated', pageId, expiresAt })
    queueMcpWebFuzzerExecution({ executionId: 'expired', pageId, expiresAt: Date.now() - 1 })

    expect(consumeMcpWebFuzzerExecution(pageId)?.executionId).toBe('deduplicated')
    expect(consumeMcpWebFuzzerExecution(pageId)).toBeUndefined()
  })
})

import { afterEach, describe, expect, it } from 'vitest'
import {
  assertValidMcpWebFuzzerExecution,
  consumeMcpWebFuzzerExecution,
  queueMcpWebFuzzerExecution,
  type McpWebFuzzerExecution,
} from '../webFuzzer'

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

describe('MCP Web Fuzzer execution push validation', () => {
  const validExecution = () => ({
    executionId: 'push-validation',
    pageId,
    expiresAt: Date.now() + 10_000,
  })

  // 与 MainOperatorContent.onServerPushExecuteWebFuzzerTab 相同的顺序：
  // 校验失败即抛错中止，不 入队 / 不触发切页与执行事件（组件内由 catch 统一错误通知）。
  const dispatchLikeServerPush = (execution: McpWebFuzzerExecution) => {
    assertValidMcpWebFuzzerExecution(execution)
    queueMcpWebFuzzerExecution(execution)
  }

  it('accepts a push carrying all required fields and enqueues it', () => {
    expect(() => dispatchLikeServerPush(validExecution())).not.toThrow()
    expect(consumeMcpWebFuzzerExecution(pageId)?.executionId).toBe('push-validation')
  })

  it('rejects a push without executionId and leaves the queue untouched', () => {
    expect(() => dispatchLikeServerPush({ ...validExecution(), executionId: '' })).toThrow(
      /Web Fuzzer execution push is invalid/,
    )
    expect(consumeMcpWebFuzzerExecution(pageId)).toBeUndefined()
  })

  it('rejects a push without pageId and leaves the queue untouched', () => {
    expect(() => dispatchLikeServerPush({ ...validExecution(), pageId: '' })).toThrow(
      /Web Fuzzer execution push is invalid/,
    )
    expect(consumeMcpWebFuzzerExecution(pageId)).toBeUndefined()
  })

  it('rejects a push whose expiresAt is missing or not a finite number and leaves the queue untouched', () => {
    for (const expiresAt of [undefined, null, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
      expect(() => dispatchLikeServerPush({ ...validExecution(), expiresAt: expiresAt as unknown as number })).toThrow(
        /Web Fuzzer execution push is invalid/,
      )
    }
    expect(consumeMcpWebFuzzerExecution(pageId)).toBeUndefined()
  })
})

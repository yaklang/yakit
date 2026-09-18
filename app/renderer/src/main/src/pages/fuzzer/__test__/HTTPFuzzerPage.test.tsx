import { afterEach, describe, expect, it } from 'vitest'
import { consumeMcpWebFuzzerExecution, queueMcpWebFuzzerExecution } from '@/utils/eventBus/events/webFuzzer'
import { createMcpWebFuzzerExecutionSlot } from '../mcpWebFuzzerExecutionSlot'

/**
 * HTTPFuzzerPage MCP 生命周期接线（start / end / cancel）防回归。
 * 页面把状态收敛到 createMcpWebFuzzerExecutionSlot，此处覆盖状态转换本身。
 */
const pageId = 'http-fuzzer-page-mcp-lifecycle'

afterEach(() => {
  while (consumeMcpWebFuzzerExecution(pageId)) {
    // drain module-local queue
  }
})

describe('HTTPFuzzerPage MCP execution lifecycle', () => {
  it('after end/release, can start the next queued command', () => {
    const slot = createMcpWebFuzzerExecutionSlot()
    const expiresAt = Date.now() + 10_000
    queueMcpWebFuzzerExecution({ executionId: 'first', pageId, expiresAt })
    queueMcpWebFuzzerExecution({ executionId: 'second', pageId, expiresAt })

    expect(slot.tryStart(pageId, false)).toBe('first')
    expect(slot.isInFlight()).toBe(true)
    // in-flight 时即使 busy=false 也不能抢占
    expect(slot.tryStart(pageId, false)).toBeUndefined()

    // 模拟 endToken：释放后可续消费
    expect(slot.release()).toBe(true)
    expect(slot.getFuzzerIndex()).toBeUndefined()
    expect(slot.tryStart(pageId, false)).toBe('second')
    expect(slot.getFuzzerIndex()).toBe('second')
  })

  it('after cancel/release, clears FuzzerIndex so manual send is not attributed to MCP', () => {
    const slot = createMcpWebFuzzerExecutionSlot()
    queueMcpWebFuzzerExecution({
      executionId: 'mcp-cancelled',
      pageId,
      expiresAt: Date.now() + 10_000,
    })

    expect(slot.tryStart(pageId, false)).toBe('mcp-cancelled')
    // 模拟 cancelCurrentHTTPFuzzer：释放槽位
    expect(slot.release()).toBe(true)
    expect(slot.isInFlight()).toBe(false)
    expect(slot.getFuzzerIndex()).toBeUndefined()

    // 手动发送走 getFuzzerRequestParams → FuzzerIndex 必须为空
    expect(slot.getFuzzerIndex()).toBeUndefined()
    // busy（loading）时不应从队列再起一条
    queueMcpWebFuzzerExecution({
      executionId: 'queued-while-manual',
      pageId,
      expiresAt: Date.now() + 10_000,
    })
    expect(slot.tryStart(pageId, true)).toBeUndefined()
    expect(consumeMcpWebFuzzerExecution(pageId)?.executionId).toBe('queued-while-manual')
  })

  it('does not start while busy (loading)', () => {
    const slot = createMcpWebFuzzerExecutionSlot()
    queueMcpWebFuzzerExecution({
      executionId: 'blocked-by-loading',
      pageId,
      expiresAt: Date.now() + 10_000,
    })
    expect(slot.tryStart(pageId, true)).toBeUndefined()
    expect(slot.isInFlight()).toBe(false)
    expect(consumeMcpWebFuzzerExecution(pageId)?.executionId).toBe('blocked-by-loading')
  })

  it('manual send must pass busy=true so duplex cannot interleave the same token', () => {
    // 对应页面：submitToHTTPFuzzer 同步写 loadingRef.current=true，再 setLoading(true)
    // 若只依赖 effect 同步 loadingRef，duplex 会在窗口内 tryStart(busy=false) 抢占同 token
    const slot = createMcpWebFuzzerExecutionSlot()
    const expiresAt = Date.now() + 10_000
    queueMcpWebFuzzerExecution({ executionId: 'race-mcp', pageId, expiresAt })

    let busy = false
    // 手动发送入口：先占 busy
    busy = true
    expect(slot.tryStart(pageId, busy)).toBeUndefined()
    expect(slot.isInFlight()).toBe(false)
    expect(consumeMcpWebFuzzerExecution(pageId)?.executionId).toBe('race-mcp')
  })
})

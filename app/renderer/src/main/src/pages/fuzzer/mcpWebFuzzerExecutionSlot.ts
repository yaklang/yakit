import { consumeMcpWebFuzzerExecution } from '@/utils/eventBus/events/webFuzzer'

/**
 * HTTPFuzzerPage MCP 执行槽位：idle → in-flight → 完成/取消后释放。
 * 抽成纯状态机便于单测覆盖「end 后可续消费」「cancel 后不污染手动发送」。
 */
export type McpWebFuzzerExecutionSlot = {
  /** 空闲且非 busy 时消费队列，成功返回 executionId */
  tryStart: (pageId: string, busy: boolean) => string | undefined
  /** 释放 in-flight；原先在飞返回 true */
  release: () => boolean
  getFuzzerIndex: () => string | undefined
  isInFlight: () => boolean
}

export function createMcpWebFuzzerExecutionSlot(
  consume: typeof consumeMcpWebFuzzerExecution = consumeMcpWebFuzzerExecution,
): McpWebFuzzerExecutionSlot {
  let inFlight = false
  let executionId: string | undefined

  return {
    tryStart(pageId, busy) {
      if (busy || inFlight) return undefined
      const execution = consume(pageId)
      if (!execution) return undefined
      inFlight = true
      executionId = execution.executionId
      return executionId
    },
    release() {
      if (!inFlight) return false
      inFlight = false
      executionId = undefined
      return true
    },
    getFuzzerIndex: () => executionId,
    isInFlight: () => inFlight,
  }
}

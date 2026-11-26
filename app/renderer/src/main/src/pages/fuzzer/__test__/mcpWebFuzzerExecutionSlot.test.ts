import { describe, expect, it } from 'vitest'
import { type McpWebFuzzerExecution } from '@/utils/eventBus/events/webFuzzer'
import { createMcpWebFuzzerExecutionSlot } from '../mcpWebFuzzerExecutionSlot'

describe('MCP Web Fuzzer execution delay overrides', () => {
  const tabSettings = { DelayMinSeconds: 3, DelayMaxSeconds: 5 }

  it('applies only the active execution overrides and clears them on release', () => {
    const commands: McpWebFuzzerExecution[] = [
      {
        executionId: 'fractional',
        pageId: 'tab',
        expiresAt: Date.now() + 10_000,
        minDelaySeconds: 0.25,
        maxDelaySeconds: 1.5,
      },
      {
        executionId: 'disabled',
        pageId: 'tab',
        expiresAt: Date.now() + 10_000,
        minDelaySeconds: 0,
        maxDelaySeconds: 0,
      },
      { executionId: 'saved-settings', pageId: 'tab', expiresAt: Date.now() + 10_000 },
    ]
    const slot = createMcpWebFuzzerExecutionSlot(() => commands.shift())
    const requestParams = () => ({ ...tabSettings, ...slot.getDelayOverrides() })

    expect(requestParams()).toEqual(tabSettings)
    expect(slot.tryStart('tab', true)).toBeUndefined()
    expect(requestParams()).toEqual(tabSettings)
    expect(slot.tryStart('tab', false)).toBe('fractional')
    expect(requestParams()).toEqual({ DelayMinSeconds: 0.25, DelayMaxSeconds: 1.5 })
    expect(slot.tryStart('tab', false)).toBeUndefined()
    expect(requestParams()).toEqual({ DelayMinSeconds: 0.25, DelayMaxSeconds: 1.5 })

    slot.release()
    expect(requestParams()).toEqual(tabSettings)
    expect(slot.tryStart('tab', false)).toBe('disabled')
    expect(requestParams()).toEqual({ DelayMinSeconds: 0, DelayMaxSeconds: 0 })
    slot.release()
    expect(requestParams()).toEqual(tabSettings)
    expect(slot.tryStart('tab', false)).toBe('saved-settings')
    expect(requestParams()).toEqual(tabSettings)
    slot.release()
    expect(slot.getFuzzerIndex()).toBeUndefined()
    expect(requestParams()).toEqual(tabSettings)
  })
})

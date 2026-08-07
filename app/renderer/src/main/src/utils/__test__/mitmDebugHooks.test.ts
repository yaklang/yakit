import { afterEach, describe, expect, it } from 'vitest'
import { areMITMDebugHooksEnabled } from '../mitmDebugHooks'

const originalYakitBridge = window.yakitBridge

afterEach(() => {
  window.yakitBridge = originalYakitBridge
})

describe('MITM debug hook gate', () => {
  it('is disabled when preload does not explicitly enable it', () => {
    window.yakitBridge = { app: {} } as YakitBridge

    expect(areMITMDebugHooksEnabled()).toBe(false)
  })

  it('is enabled only by the synchronous preload capability', () => {
    window.yakitBridge = {
      app: { isMITMDebugHooksEnabled: () => true },
    } as YakitBridge

    expect(areMITMDebugHooksEnabled()).toBe(true)
  })
})

import { afterEach, describe, expect, it } from 'vitest'
import { areMITMDebugHooksEnabled } from '../mitmDebugHooks'

const originalDebugHooks = window.yakitDebugHooks

afterEach(() => {
  window.yakitDebugHooks = originalDebugHooks
})

describe('MITM debug hook gate', () => {
  it('is disabled when preload does not explicitly enable it', () => {
    window.yakitDebugHooks = undefined

    expect(areMITMDebugHooksEnabled()).toBe(false)
  })

  it('is enabled only by the synchronous preload capability', () => {
    window.yakitDebugHooks = true

    expect(areMITMDebugHooksEnabled()).toBe(true)
  })
})

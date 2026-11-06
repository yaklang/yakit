import { afterEach, describe, expect, it } from 'vitest'
import { releaseMilkdownPopup, tryClaimMilkdownPopup } from '../../panelMutex'
afterEach(() => {
  releaseMilkdownPopup('mention')
  releaseMilkdownPopup('modeSlash')
})
describe('editor popup ownership', () => {
  it('does not let a hidden editor release another editor popup', () => {
    const visible = {},
      hidden = {}
    expect(tryClaimMilkdownPopup('modeSlash', visible)).toBe(true)
    releaseMilkdownPopup('modeSlash', hidden)
    expect(tryClaimMilkdownPopup('mention', hidden)).toBe(false)
    expect(tryClaimMilkdownPopup('modeSlash', hidden)).toBe(false)
    releaseMilkdownPopup('modeSlash', visible)
    expect(tryClaimMilkdownPopup('mention', hidden)).toBe(true)
  })
})

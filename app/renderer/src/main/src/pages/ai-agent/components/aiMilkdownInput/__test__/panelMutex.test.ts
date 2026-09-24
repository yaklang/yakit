import { afterEach, describe, expect, it } from 'vitest'
import { releaseMilkdownPopup, tryClaimMilkdownPopup } from '../panelMutex'

afterEach(() => {
  releaseMilkdownPopup('mention')
  releaseMilkdownPopup('modeSlash')
})

describe('panelMutex', () => {
  it('空闲时可占有 mention / modeSlash', () => {
    expect(tryClaimMilkdownPopup('mention')).toBe(true)
    releaseMilkdownPopup('mention')
    expect(tryClaimMilkdownPopup('modeSlash')).toBe(true)
  })

  it('同 kind 可重复 claim（保持占有）', () => {
    expect(tryClaimMilkdownPopup('mention')).toBe(true)
    expect(tryClaimMilkdownPopup('mention')).toBe(true)
  })

  it('已被另一方占用时 claim 失败', () => {
    expect(tryClaimMilkdownPopup('mention')).toBe(true)
    expect(tryClaimMilkdownPopup('modeSlash')).toBe(false)
  })

  it('release 对应 kind 后另一方可以占有', () => {
    expect(tryClaimMilkdownPopup('mention')).toBe(true)
    releaseMilkdownPopup('mention')
    expect(tryClaimMilkdownPopup('modeSlash')).toBe(true)
  })

  it('release 非当前占有方不生效', () => {
    expect(tryClaimMilkdownPopup('mention')).toBe(true)
    releaseMilkdownPopup('modeSlash')
    expect(tryClaimMilkdownPopup('modeSlash')).toBe(false)
  })
})

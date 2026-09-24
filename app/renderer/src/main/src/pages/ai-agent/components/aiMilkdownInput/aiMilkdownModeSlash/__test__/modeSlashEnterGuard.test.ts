import { describe, expect, it } from 'vitest'
import { shouldSkipModeSlashEnterConfirm } from '../modeSlashEnterGuard'

describe('shouldSkipModeSlashEnterConfirm', () => {
  it('非验收步不跳过', () => {
    const textarea = document.createElement('textarea')
    expect(shouldSkipModeSlashEnterConfirm('root', textarea)).toBe(false)
    expect(shouldSkipModeSlashEnterConfirm('goalDuration', textarea)).toBe(false)
    expect(shouldSkipModeSlashEnterConfirm('goalIterations', textarea)).toBe(false)
  })

  it('验收步且 target 为 textarea 时跳过确认（closest 自匹配）', () => {
    const textarea = document.createElement('textarea')
    expect(shouldSkipModeSlashEnterConfirm('goalAcceptance', textarea)).toBe(true)
  })

  it('验收步但焦点不在 textarea 时不跳过（可回车确认）', () => {
    const btn = document.createElement('button')
    expect(shouldSkipModeSlashEnterConfirm('goalAcceptance', btn)).toBe(false)
    expect(shouldSkipModeSlashEnterConfirm('goalAcceptance', document.body)).toBe(false)
    expect(shouldSkipModeSlashEnterConfirm('goalAcceptance', null)).toBe(false)
  })
})

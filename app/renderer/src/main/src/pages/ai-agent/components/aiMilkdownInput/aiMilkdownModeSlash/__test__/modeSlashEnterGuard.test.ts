import { describe, expect, it } from 'vitest'
import { shouldSkipModeSlashEnterConfirm } from '../modeSlashEnterGuard'

describe('shouldSkipModeSlashEnterConfirm', () => {
  it('非验收步不跳过', () => {
    const textarea = document.createElement('textarea')
    expect(shouldSkipModeSlashEnterConfirm('root', textarea)).toBe(false)
    expect(shouldSkipModeSlashEnterConfirm('goalDuration', textarea, { acceptanceDraft: '' })).toBe(false)
    expect(shouldSkipModeSlashEnterConfirm('goalIterations', textarea)).toBe(false)
  })

  it('验收步且草稿为空时跳过确认（含空白）', () => {
    const btn = document.createElement('button')
    expect(shouldSkipModeSlashEnterConfirm('goalAcceptance', btn)).toBe(true)
    expect(shouldSkipModeSlashEnterConfirm('goalAcceptance', btn, { acceptanceDraft: '' })).toBe(true)
    expect(shouldSkipModeSlashEnterConfirm('goalAcceptance', btn, { acceptanceDraft: '  ' })).toBe(true)
  })

  it('验收步有草稿且 target 为 textarea 时跳过确认（closest 自匹配）', () => {
    const textarea = document.createElement('textarea')
    expect(shouldSkipModeSlashEnterConfirm('goalAcceptance', textarea, { acceptanceDraft: '接口 200' })).toBe(true)
  })

  it('验收步有草稿且焦点不在 textarea 时不跳过（可回车确认）', () => {
    const btn = document.createElement('button')
    expect(shouldSkipModeSlashEnterConfirm('goalAcceptance', btn, { acceptanceDraft: 'done' })).toBe(false)
    expect(shouldSkipModeSlashEnterConfirm('goalAcceptance', document.body, { acceptanceDraft: 'done' })).toBe(false)
    expect(shouldSkipModeSlashEnterConfirm('goalAcceptance', null, { acceptanceDraft: 'done' })).toBe(false)
  })
})

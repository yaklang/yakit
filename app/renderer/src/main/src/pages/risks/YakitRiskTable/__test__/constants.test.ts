import { describe, expect, it, vi } from 'vitest'
import type { TFunction } from '@/i18n/useI18nNamespaces'
import { cvssToSeverityLevel, formatDisposalStatusDisplay, getDisposalStatusFromTags } from '../constants'

describe('cvssToSeverityLevel', () => {
  it.each([
    [-1, 'none'],
    [0, 'none'],
    [0.1, 'low'],
    [3.9, 'low'],
    [4, 'warning'],
    [6.9, 'warning'],
    [7, 'high'],
    [8.9, 'high'],
    [9, 'critical'],
    [10, 'critical'],
  ] as const)('maps CVSS %s to %s', (score, severity) => {
    expect(cvssToSeverityLevel(score)).toEqual({ severity })
  })
})

describe('risk disposal status helpers', () => {
  it.each([undefined, '', '   '])('treats empty status %s as no values', (tags) => {
    expect(getDisposalStatusFromTags(tags)).toEqual([])
  })

  it('trims values, drops blanks, and keeps custom statuses', () => {
    expect(getDisposalStatusFromTags(' 待验证 | | 自定义状态 |已修复 ')).toEqual(['待验证', '自定义状态', '已修复'])
  })

  it('translates preset statuses and leaves custom statuses unchanged', () => {
    const t = vi.fn((key: string) => `translated:${key}`) as unknown as TFunction

    expect(formatDisposalStatusDisplay('待验证|自定义状态|已修复', t)).toBe(
      'translated:YakitRiskEditForm.pending_verify、自定义状态、translated:YakitRiskEditForm.repaired',
    )
    expect(t).toHaveBeenNthCalledWith(1, 'YakitRiskEditForm.pending_verify')
    expect(t).toHaveBeenNthCalledWith(2, 'YakitRiskEditForm.repaired')
  })

  it('formats empty status as a placeholder without translating', () => {
    const t = vi.fn() as unknown as TFunction

    expect(formatDisposalStatusDisplay(undefined, t)).toBe('-')
    expect(t).not.toHaveBeenCalled()
  })
})

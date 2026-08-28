import { describe, expect, it } from 'vitest'
import type { TFunction } from '@/i18n/useI18nNamespaces'
import type { ProbeReasoningEffortResponse } from '../../utils'
import {
  buildReasoningEffortOptions,
  normalizeReasoningEffort,
  probedExtendedEffortsFromResponse,
} from '../reasoningEffort'

const resp = (item: Partial<ProbeReasoningEffortResponse>): ProbeReasoningEffortResponse =>
  item as ProbeReasoningEffortResponse

const t = ((key: string) => key) as TFunction

describe('normalizeReasoningEffort', () => {
  it('归一空值与跟随默认语义为 no-set', () => {
    expect(normalizeReasoningEffort(undefined)).toBe('no-set')
    expect(normalizeReasoningEffort('')).toBe('no-set')
    expect(normalizeReasoningEffort('auto')).toBe('no-set')
    expect(normalizeReasoningEffort('default')).toBe('no-set')
  })

  it('迁移旧档位取值', () => {
    expect(normalizeReasoningEffort('middle')).toBe('medium')
    expect(normalizeReasoningEffort('none')).toBe('off')
    expect(normalizeReasoningEffort('disabled')).toBe('off')
  })

  it('新档位取值原样返回', () => {
    expect(normalizeReasoningEffort('off')).toBe('off')
    expect(normalizeReasoningEffort('low')).toBe('low')
    expect(normalizeReasoningEffort('medium')).toBe('medium')
    expect(normalizeReasoningEffort('high')).toBe('high')
    expect(normalizeReasoningEffort('xhigh')).toBe('xhigh')
    expect(normalizeReasoningEffort('max')).toBe('max')
  })
})

describe('buildReasoningEffortOptions', () => {
  it('未探测时仅展示基础档位', () => {
    const options = buildReasoningEffortOptions(t)
    expect(options.map((o) => o.value)).toEqual(['no-set', 'off', 'low', 'medium', 'high'])
  })

  it('探测通过后追加对应扩展档位', () => {
    const options = buildReasoningEffortOptions(t, ['xhigh'])
    expect(options.map((o) => o.value)).toEqual(['no-set', 'off', 'low', 'medium', 'high', 'xhigh'])
  })

  it('当前值为扩展档但未探测通过时也保留该选项且不重复', () => {
    const options = buildReasoningEffortOptions(t, ['max'], 'max')
    expect(options.map((o) => o.value)).toEqual(['no-set', 'off', 'low', 'medium', 'high', 'max'])
  })

  it('当前值为旧档位时按归一化结果处理', () => {
    const options = buildReasoningEffortOptions(t, undefined, 'middle')
    expect(options.map((o) => o.value)).toEqual(['no-set', 'off', 'low', 'medium', 'high'])
  })

  it('基础档位 label 经由 t 翻译', () => {
    const options = buildReasoningEffortOptions(t)
    expect(options[0].label).toBe('ConfigNetworkPage.effortNoSet')
    expect(options[1].label).toBe('ConfigNetworkPage.effortOff')
  })
})

describe('probedExtendedEffortsFromResponse', () => {
  it('两个扩展档都支持', () => {
    expect(probedExtendedEffortsFromResponse(resp({ XhighSupported: true, MaxSupported: true }))).toEqual([
      'xhigh',
      'max',
    ])
  })

  it('仅支持其中一个', () => {
    expect(probedExtendedEffortsFromResponse(resp({ XhighSupported: false, MaxSupported: true }))).toEqual(['max'])
  })

  it('都不支持时为空数组（探测过的合法终态）', () => {
    expect(probedExtendedEffortsFromResponse(resp({ XhighSupported: false, MaxSupported: false }))).toEqual([])
  })
})

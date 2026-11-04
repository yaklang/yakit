import { describe, expect, it } from 'vitest'
import {
  buildReasoningEffortOptions,
  effortProbeResultFromResponse,
  normalizeReasoningEffort,
} from '../reasoningEffort'
describe('reasoning effort choices and probe results', () => {
  it.each([
    ['middle', 'medium'],
    ['none', 'off'],
    ['default', 'no-set'],
    ['max', 'max'],
    [undefined, 'no-set'],
  ])('normalizes %s', (input, expected) => expect(normalizeReasoningEffort(input)).toBe(expected))
  it('adds only confirmed extensions, but retains a saved extended value', () => {
    const values = (probed: string[], current?: string) =>
      buildReasoningEffortOptions((key) => (Array.isArray(key) ? key[0] : key), probed, current).map((x) => x.value)
    expect(values([])).not.toContain('max')
    expect(values(['xhigh'])).toContain('xhigh')
    expect(values([], 'max')).toContain('max')
  })
  it('treats transient probe errors as retryable, not confirmed unsupported', () => {
    expect(
      effortProbeResultFromResponse({ XhighSupported: false, MaxSupported: false, MaxErrorMessage: 'timeout' }),
    ).toEqual({ conclusive: false, efforts: [] })
    expect(effortProbeResultFromResponse({ XhighSupported: true, MaxSupported: false })).toEqual({
      conclusive: true,
      efforts: ['xhigh'],
    })
  })
})

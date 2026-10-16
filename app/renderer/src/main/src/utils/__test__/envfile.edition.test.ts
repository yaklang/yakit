import { afterEach, describe, expect, it, vi } from 'vitest'
import { isEnterpriseOrSimpleEdition } from '@/utils/envfile'

describe('isEnterpriseOrSimpleEdition', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it.each([
    ['yakit', false],
    ['yakitEE', true],
    ['yakitSE', true],
    ['irify', false],
    ['irifyEE', true],
    ['memfit', false],
    ['breachtrace', false],
  ] as const)('returns %s edition eligibility as %s', (edition, expected) => {
    vi.stubEnv('YAKIT_EDITION', edition)

    expect(isEnterpriseOrSimpleEdition()).toBe(expected)
  })
})

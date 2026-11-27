import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  FetchSoftwareVersion,
  getCurrentVersionSource,
  getStartupReleaseEditionName,
  isEnterpriseOrSimpleEdition,
} from '@/utils/envfile'

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

describe('getCurrentVersionSource', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it.each([
    ['yakit', 'yakit'],
    ['yakitEE', 'yakit'],
    ['yakitSE', 'yakit'],
    ['irify', 'irify'],
    ['irifyEE', 'irify'],
    ['memfit', 'memfit'],
    ['breachtrace', 'yakit'],
  ] as const)('maps %s to %s', (edition, expected) => {
    vi.stubEnv('YAKIT_EDITION', edition)

    expect(getCurrentVersionSource()).toBe(expected)
  })
})

describe('FetchSoftwareVersion', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  // 启动窗口保持旧行为：memfit 仍按 yakit 处理
  it.each([
    ['yakit', 'yakit'],
    ['yakitEE', 'yakit'],
    ['yakitSE', 'yakit'],
    ['irify', 'irify'],
    ['irifyEE', 'irify'],
    ['memfit', 'yakit'],
    ['breachtrace', 'yakit'],
  ] as const)('maps %s to %s', (edition, expected) => {
    vi.stubEnv('YAKIT_EDITION', edition)

    expect(FetchSoftwareVersion()).toBe(expected)
  })
})

describe('getStartupReleaseEditionName', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it.each([
    ['yakit', 'Yakit'],
    ['yakitEE', 'EnpriTrace'],
    ['yakitSE', 'EnpriTraceAgent'],
    ['irify', 'IRify'],
    ['irifyEE', 'IRify-EnpriTrace'],
    ['memfit', 'Memfit AI'],
    ['breachtrace', 'Yakit'],
  ] as const)('maps %s to %s', (edition, expected) => {
    vi.stubEnv('YAKIT_EDITION', edition)

    expect(getStartupReleaseEditionName()).toBe(expected)
  })
})

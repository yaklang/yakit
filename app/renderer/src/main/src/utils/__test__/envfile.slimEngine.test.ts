import { afterEach, describe, expect, it } from 'vitest'
import { getOfficialYakEngineArtifactPrefix, toDefaultYakEngineDownloadVersion } from '@/utils/envfile'

describe('community Yakit default slim engine', () => {
  const prevEdition = process.env.YAKIT_EDITION

  afterEach(() => {
    if (prevEdition === undefined) delete process.env.YAKIT_EDITION
    else process.env.YAKIT_EDITION = prevEdition
  })

  it('prefixes latest official downloads with slim/ only for community Yakit', () => {
    process.env.YAKIT_EDITION = 'yakit'
    expect(toDefaultYakEngineDownloadVersion('1.4.8-beta19')).toBe('slim/1.4.8-beta19')
    expect(toDefaultYakEngineDownloadVersion('slim/1.4.8-beta19')).toBe('slim/1.4.8-beta19')
    expect(toDefaultYakEngineDownloadVersion('dev/abc')).toBe('dev/abc')
    expect(toDefaultYakEngineDownloadVersion('')).toBe('')

    process.env.YAKIT_EDITION = 'yakitEE'
    expect(toDefaultYakEngineDownloadVersion('1.4.8-beta19')).toBe('1.4.8-beta19')
    process.env.YAKIT_EDITION = 'yakitSE'
    expect(toDefaultYakEngineDownloadVersion('1.4.8-beta19')).toBe('1.4.8-beta19')
    process.env.YAKIT_EDITION = 'irify'
    expect(toDefaultYakEngineDownloadVersion('1.4.8-beta19')).toBe('1.4.8-beta19')
    process.env.YAKIT_EDITION = 'irifyEE'
    expect(toDefaultYakEngineDownloadVersion('1.4.8-beta19')).toBe('1.4.8-beta19')
    process.env.YAKIT_EDITION = 'memfit'
    expect(toDefaultYakEngineDownloadVersion('1.4.8-beta19')).toBe('1.4.8-beta19')
  })

  it('uses yak-slim_ official artifact names only for community Yakit', () => {
    process.env.YAKIT_EDITION = 'yakit'
    expect(getOfficialYakEngineArtifactPrefix()).toBe('yak-slim_')
    process.env.YAKIT_EDITION = 'yakitEE'
    expect(getOfficialYakEngineArtifactPrefix()).toBe('yak_')
    process.env.YAKIT_EDITION = 'yakitSE'
    expect(getOfficialYakEngineArtifactPrefix()).toBe('yak_')
    process.env.YAKIT_EDITION = 'irify'
    expect(getOfficialYakEngineArtifactPrefix()).toBe('yak_')
    process.env.YAKIT_EDITION = 'memfit'
    expect(getOfficialYakEngineArtifactPrefix()).toBe('yak_')
  })
})

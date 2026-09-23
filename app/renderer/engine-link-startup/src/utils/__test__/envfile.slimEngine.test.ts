import { describe, expect, it } from 'vitest'
import { getOfficialYakEngineArtifactPrefix, toDefaultYakEngineDownloadVersion, toEngineSourceHashVersion } from '@/utils/envfile'

describe('engine-link slim engine helpers', () => {
  it('defaults community downloads to the slim artifact', () => {
    expect(toDefaultYakEngineDownloadVersion('1.4.8-beta19')).toBe('slim/1.4.8-beta19')
    expect(toDefaultYakEngineDownloadVersion('slim/1.4.8-beta19')).toBe('slim/1.4.8-beta19')
    expect(toDefaultYakEngineDownloadVersion('dev/abc')).toBe('dev/abc')
    expect(getOfficialYakEngineArtifactPrefix()).toBe('yak-slim_')
  })

  it('checks slim engines against the slim artifact hash', () => {
    expect(toEngineSourceHashVersion('1.4.8-beta19', 'slim')).toBe('slim/1.4.8-beta19')
    expect(toEngineSourceHashVersion('v1.4.8-beta19', 'slim')).toBe('slim/1.4.8-beta19')
    expect(toEngineSourceHashVersion('1.4.8-beta19', 'full')).toBe('1.4.8-beta19')
  })
})

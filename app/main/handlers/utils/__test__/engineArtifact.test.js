const {
  getOssEngineVersion,
  getYakEngineNamePrefix,
  getLocalEngineCacheName,
  getYakEngineArtifactFileName,
  getYakEngineArtifactOssPath,
  resolveEngineArtifactVersion,
  getFullEngineArtifactVersion,
} = require('../engineArtifact')

describe('community Yakit slim engine artifact names', () => {
  it('maps slim/ versions to yak-slim_ official artifacts', () => {
    expect(getOssEngineVersion('slim/1.4.8-beta19')).toBe('1.4.8-beta19')
    expect(getYakEngineNamePrefix('slim/1.4.8-beta19')).toBe('yak-slim_')
    expect(getYakEngineArtifactOssPath('slim/1.4.8-beta19', { platform: 'win32' })).toBe(
      '1.4.8-beta19/yak-slim_windows_amd64.exe',
    )
    expect(getYakEngineArtifactOssPath('slim/1.4.8-beta19', { platform: 'linux', arch: 'x64' })).toBe(
      '1.4.8-beta19/yak-slim_linux_amd64',
    )
    expect(getYakEngineArtifactOssPath('slim/1.4.8-beta19', { platform: 'darwin', arch: 'arm64' })).toBe(
      '1.4.8-beta19/yak-slim_darwin_arm64',
    )
    expect(getLocalEngineCacheName('slim/1.4.8-beta19', false)).toBe('yak-slim-1.4.8-beta19')
  })

  it('keeps official full engines on yak_ unless the version itself is slim or edition-specific', () => {
    expect(getYakEngineNamePrefix('1.4.8-beta19')).toBe('yak_')
    expect(getYakEngineArtifactOssPath('1.4.8-beta19', { platform: 'win32' })).toBe(
      '1.4.8-beta19/yak_windows_amd64.exe',
    )
    expect(getYakEngineNamePrefix('yaklang_yakit_1.4.8')).toBe('yaklang_yakit_')
    expect(getYakEngineNamePrefix('yaklang_irify_1.4.8')).toBe('yaklang_irify_')
    expect(getLocalEngineCacheName('dev/abc', false)).toBe('yak-dev-abc')
  })

  it('keeps slim names on legacy and exposes the matching full version for fallback', () => {
    expect(resolveEngineArtifactVersion('slim/1.4.8-beta19')).toBe('slim/1.4.8-beta19')
    expect(getFullEngineArtifactVersion('slim/1.4.8-beta19')).toBe('1.4.8-beta19')
    expect(getFullEngineArtifactVersion('1.4.8-beta19')).toBe('')
    expect(getYakEngineArtifactFileName('slim/1.4.8-beta19', { platform: 'win32', isLegacy: true })).toBe(
      'yak-slim_windows_legacy_amd64.exe',
    )
    expect(getYakEngineArtifactOssPath('slim/1.4.8-beta19', { platform: 'win32', isLegacy: true })).toBe(
      '1.4.8-beta19/yak-slim_windows_legacy_amd64.exe',
    )
    expect(getYakEngineArtifactFileName('1.4.8-beta19', { platform: 'win32', isLegacy: true })).toBe(
      'yak_windows_legacy_amd64.exe',
    )
    expect(getLocalEngineCacheName('slim/1.4.8-beta19')).toBe('yak-slim-1.4.8-beta19')
  })
})

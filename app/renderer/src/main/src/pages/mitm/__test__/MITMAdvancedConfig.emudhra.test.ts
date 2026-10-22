import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RemoteMitmGV } from '@/enums/mitm'

const storage = vi.hoisted(() => new Map<string, string>())
vi.mock('@/utils/kv', () => ({
  getRemoteValue: vi.fn(async (key: string) => storage.get(key) || ''),
  setRemoteValue: vi.fn((key: string, value: string) => storage.set(key, value)),
}))
vi.mock('@/utils/tool', () => ({ JSONParseLog: (raw: string) => (raw ? JSON.parse(raw) : []) }))

import {
  buildMitmExtra,
  buildMitmExtraV2,
  createDefaultAdvancedConfig,
  loadAdvancedConfig,
  saveAdvancedConfig,
  updateAdvancedConfig,
} from '../MITMAdvancedConfig'

describe('MITM eMudhra configuration', () => {
  beforeEach(() => storage.clear())

  it('defaults to disabled for both new and existing settings', async () => {
    expect(createDefaultAdvancedConfig().UseEMudhra).toBe(false)
    expect((await loadAdvancedConfig()).UseEMudhra).toBe(false)
    storage.set(RemoteMitmGV.MitmAdvancedConfig, JSON.stringify({ dnsServers: ['1.1.1.1'] }))
    expect(await loadAdvancedConfig()).toMatchObject({ UseEMudhra: false, dnsServers: ['1.1.1.1'] })
  })

  it('persists enabled and disabled values without losing unrelated settings', async () => {
    saveAdvancedConfig({ ...createDefaultAdvancedConfig(), UseEMudhra: true, PluginConcurrency: 32 })
    expect(await loadAdvancedConfig()).toMatchObject({ UseEMudhra: true, PluginConcurrency: 32 })
    await updateAdvancedConfig({ SNI: 'example.test' })
    expect((await loadAdvancedConfig()).UseEMudhra).toBe(true)
    await updateAdvancedConfig({ UseEMudhra: false })
    expect(await loadAdvancedConfig()).toMatchObject({ UseEMudhra: false, PluginConcurrency: 32 })
  })

  it.each([undefined, null, 'true', 'false', 1])('does not opt in for a non-boolean value %s', async (value) => {
    storage.set(RemoteMitmGV.MitmAdvancedConfig, JSON.stringify({ UseEMudhra: value }))
    expect((await loadAdvancedConfig()).UseEMudhra).toBe(false)
  })

  it.each([false, true])('passes the explicit value %s to MITM V2', (UseEMudhra) => {
    const extra = buildMitmExtra({ ...createDefaultAdvancedConfig(), UseEMudhra })
    expect(extra.UseEMudhra).toBe(UseEMudhra)
    expect(buildMitmExtraV2(extra)?.UseEMudhra).toBe(UseEMudhra)
  })

  it('keeps MITM V2 disabled when a legacy caller omits the option', () => {
    const { UseEMudhra: _unused, ...legacy } = buildMitmExtra(createDefaultAdvancedConfig())
    expect(buildMitmExtraV2(legacy)?.UseEMudhra).toBe(false)
  })
})

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { defaultAIGlobalConfig } from '@/pages/ai-agent/defaultConstant'
import type { AIGlobalConfig, AIModelConfig } from '@/pages/ai-agent/aiModelList/utils'
import { grpcGetAIGlobalConfig, grpcSetAIGlobalConfig } from '@/pages/ai-agent/aiModelList/utils'
import type { API } from '@/services/swagger/resposeType'
import { useAIGlobalConfigStore } from '@/store/aiGlobalConfig'
import useAIGlobalConfig, { clearOnlineAIGlobalConfig, syncOnlineAIGlobalConfig } from '../useAIGlobalConfig'

vi.mock('@/pages/ai-agent/aiModelList/utils', () => ({
  grpcGetAIGlobalConfig: vi.fn(),
  grpcSetAIGlobalConfig: vi.fn(),
}))

const model = (name: string, user: string, online = true): AIModelConfig =>
  ({
    ModelName: name,
    ProviderId: '0',
    Provider: { Type: 'custom', Headers: [{ Key: 'agile-user-id', Value: user }] },
    ExtraParams: [],
    IsOnline: online,
  }) as AIModelConfig

const response = (user: string, isOpen = true): API.SystemConfigResponse =>
  ({
    data: [{ configName: 'AI', isOpen, content: JSON.stringify({ IntelligentModels: [model('enterprise', user)] }) }],
  }) as API.SystemConfigResponse

describe('enterprise model config download', () => {
  let persisted: AIGlobalConfig
  beforeEach(async () => {
    vi.clearAllMocks()
    persisted = structuredClone(defaultAIGlobalConfig)
    vi.mocked(grpcGetAIGlobalConfig).mockImplementation(async () => structuredClone(persisted))
    vi.mocked(grpcSetAIGlobalConfig).mockImplementation(async (value) => {
      persisted = structuredClone(value)
      return null
    })
    await clearOnlineAIGlobalConfig()
    persisted.IntelligentModels = [model('local', 'local-value', false), model('enterprise', 'alice.zh')]
    persisted.LightweightModels = [model('old-light', 'alice.zh')]
    persisted.VisionModels = [model('old-vision', 'alice.zh')]
    useAIGlobalConfigStore.getState().setAIGlobalConfig(structuredClone(persisted))
    useAIGlobalConfigStore.setState({ isInit: false })
  })

  it('clears the previous identity before downloading, keeps local models, and persists Bob’s header', async () => {
    const fetchConfig = vi.fn(async () => {
      expect(persisted.IntelligentModels.map((m) => m.ModelName)).toEqual(['local'])
      expect(persisted.LightweightModels).toEqual([])
      expect(persisted.VisionModels).toEqual([])
      return response('bob.zh')
    })
    await syncOnlineAIGlobalConfig(fetchConfig, () => true)
    expect(persisted.IntelligentModels.map((m) => m.ModelName)).toEqual(['local', 'enterprise'])
    expect(persisted.IntelligentModels[1].Provider.Headers).toEqual([{ Key: 'agile-user-id', Value: 'bob.zh' }])
    expect(persisted.IntelligentModels[0].Provider.Headers?.[0].Value).toBe('local-value')
    expect(useAIGlobalConfigStore.getState().aiGlobalConfig).toEqual(persisted)
  })

  it.each(['failure', 'missing', 'disabled', 'malformed', 'unresolved'] as const)(
    '%s config cannot retain a previous enterprise identity',
    async (kind) => {
      const fetchConfig = async () => {
        if (kind === 'failure') throw new Error('offline')
        if (kind === 'missing') return { ...response(''), data: [] }
        if (kind === 'disabled') return response('bob.zh', false)
        if (kind === 'unresolved') return response('{{user.adUsername}}')
        return { data: [{ configName: 'AI', isOpen: true, content: '{' }] } as API.SystemConfigResponse
      }
      const task = syncOnlineAIGlobalConfig(fetchConfig, () => true)
      if (['failure', 'malformed', 'unresolved'].includes(kind)) await expect(task).rejects.toBeDefined()
      else await task
      expect(persisted.IntelligentModels).toEqual([model('local', 'local-value', false)])
      expect(persisted.LightweightModels).toEqual([])
    },
  )

  it('ignores a download that completes after logout', async () => {
    let finish!: (value: API.SystemConfigResponse) => void
    const fetchConfig = vi.fn(
      () =>
        new Promise<API.SystemConfigResponse>((resolve) => {
          finish = resolve
        }),
    )
    const download = syncOnlineAIGlobalConfig(fetchConfig, () => true)
    await vi.waitFor(() => expect(fetchConfig).toHaveBeenCalled())
    await clearOnlineAIGlobalConfig()
    finish(response('alice.zh'))
    expect(await download).toBeUndefined()
    expect(persisted.IntelligentModels).toEqual([model('local', 'local-value', false)])
  })

  it('a settings save queued during logout cannot restore the previous user’s models', async () => {
    const { result } = renderHook(() => useAIGlobalConfig())
    let release!: (config: AIGlobalConfig) => void
    vi.mocked(grpcGetAIGlobalConfig).mockImplementationOnce(
      () =>
        new Promise<AIGlobalConfig>((resolve) => {
          release = resolve
        }),
    )
    await act(async () => {
      const logout = clearOnlineAIGlobalConfig()
      await vi.waitFor(() => expect(release).toBeDefined())
      const settings = result.current[1].setAIGlobalConfig({ DisableFallback: true })
      release(structuredClone(persisted))
      await Promise.all([logout, settings])
    })
    expect(persisted.DisableFallback).toBe(true)
    expect(persisted.IntelligentModels).toEqual([model('local', 'local-value', false)])
    expect(persisted.LightweightModels).toEqual([])
    expect(useAIGlobalConfigStore.getState().aiGlobalConfig).toEqual(persisted)
  })

  it('a slow Alice response cannot overwrite Bob’s completed download', async () => {
    let finish!: (value: API.SystemConfigResponse) => void
    const aliceFetch = vi.fn(
      () =>
        new Promise<API.SystemConfigResponse>((resolve) => {
          finish = resolve
        }),
    )
    const alice = syncOnlineAIGlobalConfig(aliceFetch, () => true)
    await vi.waitFor(() => expect(aliceFetch).toHaveBeenCalled())
    await syncOnlineAIGlobalConfig(
      async () => response('bob.zh'),
      () => true,
    )
    finish(response('alice.zh'))
    expect(await alice).toBeUndefined()
    expect(persisted.IntelligentModels[1].Provider.Headers?.[0].Value).toBe('bob.zh')
  })

  it('rejects a response when the login token changes', async () => {
    let sameSession = true
    await syncOnlineAIGlobalConfig(
      async () => {
        sameSession = false
        return response('alice.zh')
      },
      () => sameSession,
    )
    expect(persisted.IntelligentModels).toEqual([model('local', 'local-value', false)])
  })

  it('preserves an enterprise model ahead of a local fallback', async () => {
    persisted.IntelligentModels.reverse()
    await syncOnlineAIGlobalConfig(
      async () => response('bob.zh'),
      () => true,
    )
    expect(persisted.IntelligentModels.map((m) => m.ModelName)).toEqual(['enterprise', 'local'])
    expect(persisted.IntelligentModels[0].Provider.Headers?.[0].Value).toBe('bob.zh')
  })

  it('does not serialize web provider IDs into the engine int64 field', async () => {
    const data = response('bob.zh')
    const config = JSON.parse(data.data[0].content)
    config.IntelligentModels[0].ProviderId = 'web-provider-id'
    data.data[0].content = JSON.stringify(config)
    await syncOnlineAIGlobalConfig(
      async () => data,
      () => true,
    )
    expect(persisted.IntelligentModels[1].ProviderId).toBe('0')
    expect(persisted.IntelligentModels[1].Provider.Headers?.[0].Value).toBe('bob.zh')
  })

  it('ignores an old request failure after a new session has synced', async () => {
    let reject!: (error: Error) => void
    const oldFetch = vi.fn(
      () =>
        new Promise<API.SystemConfigResponse>((_, fail) => {
          reject = fail
        }),
    )
    const old = syncOnlineAIGlobalConfig(oldFetch, () => true)
    await vi.waitFor(() => expect(oldFetch).toHaveBeenCalled())
    await syncOnlineAIGlobalConfig(
      async () => response('bob.zh'),
      () => true,
    )
    reject(new Error('old connection failed'))
    expect(await old).toBeUndefined()
    expect(persisted.IntelligentModels[1].Provider.Headers?.[0].Value).toBe('bob.zh')
  })
})

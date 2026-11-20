import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RemoteHistoryGV } from '@/enums/history'
import { getRemoteValue, setRemoteValue } from '@/utils/kv'
import { yakitFailed } from '@/utils/notification'
import { DEFAULT_HIDDEN_HTTP_HEADERS } from '@/utils/hiddenHTTPHeaders'
import type { HTTPHeaderVisibilitySettings } from '../editorHeaderVisibility'

vi.mock('@/utils/kv', () => ({ getRemoteValue: vi.fn(), setRemoteValue: vi.fn() }))
vi.mock('@/utils/notification', () => ({ yakitFailed: vi.fn() }))

const key = RemoteHistoryGV.HTTPHeaderVisibility
const defaults = (): HTTPHeaderVisibilitySettings => ({
  request: { hidden: false, headers: DEFAULT_HIDDEN_HTTP_HEADERS.request },
  response: { hidden: false, headers: DEFAULT_HIDDEN_HTTP_HEADERS.response },
})
const loadStore = async () => (await import('../editorHeaderVisibility')).useEditorHeaderVisibility
const persistence = (settings?: HTTPHeaderVisibilitySettings) => {
  const saved = new Map<string, string>(settings ? [[key, JSON.stringify(settings)]] : [])
  vi.mocked(getRemoteValue).mockImplementation(async (name) => saved.get(name) || '')
  vi.mocked(setRemoteValue).mockImplementation(async (name, value) => {
    saved.set(name, value)
  })
  return saved
}
const deferred = () => {
  let resolve!: () => void
  const promise = new Promise<void>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

beforeEach(() => {
  localStorage.clear()
  vi.resetModules()
  vi.resetAllMocks()
  persistence()
})

describe('persistent HTTP header visibility', () => {
  it.each(['', 'invalid', 'false', '[3]'])(
    'uses defaults without writing for absent or malformed settings: %j',
    async (value) => {
      vi.mocked(getRemoteValue).mockResolvedValue(value)
      const store = await loadStore()
      await store.getState().initialize()
      expect(store.getState().hidden).toEqual({ request: false, response: false })
      expect(store.getState().headers).toEqual(DEFAULT_HIDDEN_HTTP_HEADERS)
      expect(setRemoteValue).not.toHaveBeenCalled()
      expect(getRemoteValue).toHaveBeenCalledExactlyOnceWith(key)
    },
  )

  it('shares initialization and loads both directions from one committed record', async () => {
    persistence({
      request: { hidden: true, headers: [' X-Custom ', 'x-custom'] },
      response: { hidden: false, headers: [] },
    })
    const store = await loadStore()
    const loading = store.getState().initialize()
    expect(store.getState().initialize()).toBe(loading)
    await loading
    expect(store.getState().headers).toEqual({ request: ['x-custom'], response: [] })
    expect(store.getState().hidden).toEqual({ request: true, response: false })
    expect(getRemoteValue).toHaveBeenCalledExactlyOnceWith(key)
    expect(setRemoteValue).not.toHaveBeenCalled()
  })

  it('restores the last committed state synchronously from the local mirror', async () => {
    persistence()
    let store = await loadStore()
    await store.getState().initialize()
    await store.getState().saveSettings({
      request: { hidden: true, headers: ['x-local'] },
      response: { hidden: false, headers: [] },
    })
    vi.resetModules()
    store = await loadStore()
    expect(store.getState().hidden).toEqual({ request: true, response: false })
    expect(store.getState().headers).toEqual({ request: ['x-local'], response: [] })
  })

  it.each(['request', 'response'] as const)(
    '%s 新增、删除、清空和恢复默认在重启后保留，且不影响另一方向',
    async (role) => {
      persistence()
      const other = role === 'request' ? 'response' : 'request'
      let store = await loadStore()
      for (const settings of [
        { hidden: true, headers: [...DEFAULT_HIDDEN_HTTP_HEADERS[role].slice(1), 'x-added'] },
        { hidden: true, headers: [] },
        { hidden: false, headers: DEFAULT_HIDDEN_HTTP_HEADERS[role] },
      ]) {
        const next = defaults()
        next[role] = settings
        next[other] = { hidden: true, headers: ['x-other'] }
        await store.getState().saveSettings(next)
        vi.resetModules()
        store = await loadStore()
        await store.getState().initialize()
        expect(store.getState().headers[role]).toEqual(settings.headers)
        expect(store.getState().hidden[role]).toBe(settings.hidden)
        expect(store.getState().headers[other]).toEqual(['x-other'])
        expect(store.getState().hidden[other]).toBe(true)
      }
    },
  )

  it('commits both lists and switches with exactly one write, so there is no partial multi-key save', async () => {
    const saved = persistence()
    const store = await loadStore()
    const settings = {
      request: { hidden: true, headers: [' X-Custom ', 'x-custom'] },
      response: { hidden: true, headers: [] },
    }
    await store.getState().saveSettings(settings)
    expect(setRemoteValue).toHaveBeenCalledTimes(1)
    expect(saved.size).toBe(1)
    expect(JSON.parse(saved.get(key)!)).toEqual({
      request: { hidden: true, headers: ['x-custom'] },
      response: { hidden: true, headers: [] },
    })
  })

  it('failed submission leaves both directions unchanged in memory and after restarting, and can retry', async () => {
    const previous = defaults()
    const saved = persistence(previous)
    const store = await loadStore()
    await store.getState().initialize()
    const next = { request: { hidden: true, headers: ['x-request'] }, response: { hidden: true, headers: [] } }
    vi.mocked(setRemoteValue).mockRejectedValueOnce(new Error('write failed'))
    await expect(store.getState().saveSettings(next)).rejects.toThrow('write failed')
    expect(store.getState().headers).toEqual(DEFAULT_HIDDEN_HTTP_HEADERS)
    expect(store.getState().hidden).toEqual({ request: false, response: false })
    expect(JSON.parse(saved.get(key)!)).toEqual(previous)
    vi.resetModules()
    const restarted = await loadStore()
    await restarted.getState().initialize()
    expect(restarted.getState().headers).toEqual(DEFAULT_HIDDEN_HTTP_HEADERS)
    await store.getState().saveSettings(next)
    expect(JSON.parse(saved.get(key)!)).toEqual(next)
  })

  it.each(['request', 'response'] as const)(
    'rejects an invalid %s header before writing either direction',
    async (role) => {
      const next = defaults()
      next[role] = { hidden: true, headers: ['Bad: header'] }
      const store = await loadStore()
      await expect(store.getState().saveSettings(next)).rejects.toThrow('HTTPHeaderVisibility.invalidName')
      expect(setRemoteValue).not.toHaveBeenCalled()
    },
  )

  it('keeps a later toolbar click after an earlier settings save completes', async () => {
    const saved = persistence()
    const blocked = deferred()
    const store = await loadStore()
    await store.getState().initialize()
    vi.mocked(setRemoteValue).mockImplementationOnce(async (name, value) => {
      await blocked.promise
      saved.set(name, value)
    })
    const saving = store
      .getState()
      .saveSettings({ request: { hidden: false, headers: ['x-custom'] }, response: { hidden: true, headers: [] } })
    await vi.waitFor(() => expect(setRemoteValue).toHaveBeenCalledTimes(1))
    const toggling = store.getState().toggle('request')
    blocked.resolve()
    await Promise.all([saving, toggling])
    expect(store.getState().hidden).toEqual({ request: true, response: true })
    expect(JSON.parse(saved.get(key)!)).toEqual({
      request: { hidden: true, headers: ['x-custom'] },
      response: { hidden: true, headers: [] },
    })
  })

  it('serializes rapid toggles across directions without persisting pending edits prematurely', async () => {
    const saved = persistence()
    const blocked = deferred()
    const store = await loadStore()
    await store.getState().initialize()
    vi.mocked(setRemoteValue).mockImplementationOnce(async (name, value) => {
      await blocked.promise
      saved.set(name, value)
    })
    const first = store.getState().toggle('request')
    await vi.waitFor(() => expect(setRemoteValue).toHaveBeenCalledTimes(1))
    const second = store.getState().toggle('request')
    const third = store.getState().toggle('response')
    expect(store.getState().hidden).toEqual({ request: false, response: true })
    expect(JSON.parse(vi.mocked(setRemoteValue).mock.calls[0][1]).response.hidden).toBe(false)
    blocked.resolve()
    await Promise.all([first, second, third])
    expect(
      vi.mocked(setRemoteValue).mock.calls.map(([, value]) => {
        const s = JSON.parse(value)
        return [s.request.hidden, s.response.hidden]
      }),
    ).toEqual([
      [true, false],
      [false, false],
      [false, true],
    ])
    expect(JSON.parse(saved.get(key)!).response.hidden).toBe(true)
  })

  it('a click during slow initialization preserves the saved custom lists and other direction', async () => {
    const settings = { request: { hidden: false, headers: ['x-custom'] }, response: { hidden: true, headers: [] } }
    const saved = persistence(settings)
    const blocked = deferred()
    vi.mocked(getRemoteValue).mockImplementationOnce(async () => {
      await blocked.promise
      return JSON.stringify(settings)
    })
    const store = await loadStore()
    const loading = store.getState().initialize()
    const toggling = store.getState().toggle('request')
    expect(store.getState().hidden.request).toBe(true)
    expect(setRemoteValue).not.toHaveBeenCalled()
    blocked.resolve()
    await Promise.all([loading, toggling])
    expect(store.getState().hidden).toEqual({ request: true, response: true })
    expect(JSON.parse(saved.get(key)!)).toEqual({ ...settings, request: { hidden: true, headers: ['x-custom'] } })
  })

  it('rolls back a failed toolbar write and permits the next click to retry', async () => {
    const saved = persistence(defaults())
    const store = await loadStore()
    await store.getState().initialize()
    vi.mocked(setRemoteValue).mockRejectedValueOnce(new Error('write failed'))
    await store.getState().toggle('request')
    expect(yakitFailed).toHaveBeenCalledWith('Error: write failed')
    expect(store.getState().hidden.request).toBe(false)
    expect(JSON.parse(saved.get(key)!).request.hidden).toBe(false)
    await store.getState().toggle('request')
    expect(store.getState().hidden.request).toBe(true)
    expect(JSON.parse(saved.get(key)!).request.hidden).toBe(true)
  })

  it('uses a translated message when a toolbar click cannot load the settings', async () => {
    vi.mocked(getRemoteValue).mockRejectedValue(new Error('disconnected'))
    const store = await loadStore()
    await store.getState().toggle('response')
    expect(yakitFailed).toHaveBeenLastCalledWith('Error: HTTPHeaderVisibility.notLoaded')
    expect(setRemoteValue).not.toHaveBeenCalled()
    expect(store.getState().hidden.response).toBe(false)
  })

  it('reports read failure and permits retry without overwriting stored preferences', async () => {
    persistence({ ...defaults(), response: { hidden: true, headers: ['server'] } })
    vi.mocked(getRemoteValue).mockRejectedValueOnce(new Error('read failed'))
    const store = await loadStore()
    await store.getState().initialize()
    expect(yakitFailed).toHaveBeenCalledWith('Error: read failed')
    expect(store.getState().ready.response).toBe(false)
    expect(setRemoteValue).not.toHaveBeenCalled()
    await store.getState().initialize()
    expect(store.getState().hidden.response).toBe(true)
  })

  it('does not let a failed click during initialization suppress preferences on a later retry', async () => {
    persistence({ ...defaults(), request: { hidden: true, headers: ['accept'] } })
    vi.mocked(getRemoteValue).mockRejectedValueOnce(new Error('disconnected'))
    const store = await loadStore()
    await store.getState().toggle('request')
    expect(store.getState().ready.request).toBe(false)
    expect(setRemoteValue).not.toHaveBeenCalled()
    await store.getState().initialize()
    expect(store.getState().hidden.request).toBe(true)
  })

  it.each(['["bad:name"]', '[3]', '{}'])(
    'falls back to the role default for an invalid header list: %s',
    async (headers) => {
      vi.mocked(getRemoteValue).mockResolvedValue(
        `{"request":{"hidden":true,"headers":${headers}},"response":{"hidden":false,"headers":[]}}`,
      )
      const store = await loadStore()
      await store.getState().initialize()
      expect(store.getState().headers).toEqual({ request: DEFAULT_HIDDEN_HTTP_HEADERS.request, response: [] })
    },
  )
})

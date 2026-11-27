import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  const linkResources = { StartupPage: { no_image: 'No image' } }
  const loadLocaleResource = vi.fn(async (_lng: string, ns: string) => (ns === 'link' ? linkResources : {}))
  const resourcesToBackend = vi.fn((load: (lng: string, ns: string) => Promise<unknown>) => ({
    type: 'backend',
    init() {},
    read(lng: string, ns: string, callback: (error: unknown, data?: unknown) => void) {
      load(lng, ns)
        .then((data) => callback(null, data))
        .catch(callback)
    },
  }))
  return { linkResources, loadLocaleResource, resourcesToBackend }
})

vi.mock('i18next-resources-to-backend', () => ({ default: mocks.resourcesToBackend }))
vi.mock('@/i18n/localeLoader', () => ({ loadLocaleResource: mocks.loadLocaleResource }))

async function waitForInitialized(i18n: { isInitialized: boolean; on: (event: string, cb: () => void) => void }) {
  if (i18n.isInitialized) return
  await new Promise<void>((resolve) => i18n.on('initialized', resolve))
}

describe('Link i18n backend resources', () => {
  beforeEach(() => {
    vi.resetModules()
    mocks.loadLocaleResource.mockClear()
    window.__YAKIT_ENTRY__ = 'link'
    vi.stubEnv('YAKIT_EDITION', 'yakit')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    delete window.__YAKIT_ENTRY__
  })

  it('Link 社区版走 backend 按需加载 link/yakitUi', async () => {
    const { default: i18n } = await import('../i18n')

    expect(i18n.options.ns).toEqual(['link', 'yakitUi'])
    await waitForInitialized(i18n)

    expect(mocks.loadLocaleResource).toHaveBeenCalledWith('zh', 'link')
    expect(i18n.t('StartupPage.no_image', { ns: 'link' })).toBe('No image')
  })
})

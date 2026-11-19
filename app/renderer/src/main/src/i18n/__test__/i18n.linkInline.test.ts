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
  return {
    linkResources,
    loadLocaleResource,
    resourcesToBackend,
    linkInline: { link: linkResources, yakitUi: {} },
  }
})

vi.mock('i18next-resources-to-backend', () => ({ default: mocks.resourcesToBackend }))
vi.mock('@/i18n/localeLoader', () => ({ loadLocaleResource: mocks.loadLocaleResource }))
vi.mock('@/i18n/inlineResources', () => ({ inlineZhResources: { yakitUi: {} } }))
vi.mock('@/engineLinkStartup/i18n/inlineResources', () => ({ inlineZhResources: mocks.linkInline }))

async function waitForInitialized(i18n: { isInitialized: boolean; on: (event: string, cb: () => void) => void }) {
  if (i18n.isInitialized) return
  await new Promise<void>((resolve) => i18n.on('initialized', resolve))
}

describe('Link i18n resources', () => {
  beforeEach(() => {
    vi.resetModules()
    mocks.loadLocaleResource.mockClear()
    mocks.resourcesToBackend.mockClear()
    window.__YAKIT_ENTRY__ = 'link'
    vi.stubEnv('YAKIT_EDITION', 'yakitEE')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    delete window.__YAKIT_ENTRY__
  })

  it('Link 企业版开发态也走 inline，只加载 link/yakitUi', async () => {
    const { default: i18n } = await import('../i18n')

    expect(i18n.options.ns).toEqual(['link', 'yakitUi'])
    await waitForInitialized(i18n)

    expect(i18n.options.resources?.zh).toHaveProperty('link')
    expect(i18n.options.resources?.zh).toHaveProperty('yakitUi')
    expect(mocks.loadLocaleResource).not.toHaveBeenCalled()
    expect(i18n.t('StartupPage.no_image', { ns: 'link' })).toBe('No image')
  })

  it('主窗口企业版仍使用主窗口 inline 资源', async () => {
    delete window.__YAKIT_ENTRY__
    const { default: i18n } = await import('../i18n')

    expect(i18n.options.ns).toEqual(['yakitUi'])
    expect(i18n.options.resources?.zh).toHaveProperty('yakitUi')
    expect(i18n.options.resources?.zh).not.toHaveProperty('link')
  })
})

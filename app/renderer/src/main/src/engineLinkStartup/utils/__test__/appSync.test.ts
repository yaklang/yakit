import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  onSync: vi.fn(),
  syncTheme: vi.fn(),
  changeLanguage: vi.fn(),
}))

vi.mock('@/engineLinkStartup/utils/bridgeFacade', () => ({
  yakitApp: { onSync: mocks.onSync },
}))
vi.mock('@/hook/useTheme', () => ({
  useTheme: { getState: () => ({ syncTheme: mocks.syncTheme }) },
}))
vi.mock('@/i18n/i18n', () => ({ default: { changeLanguage: mocks.changeLanguage } }))

async function loadRegister() {
  vi.resetModules()
  return import('../appSync')
}

beforeEach(() => {
  mocks.onSync.mockReset().mockReturnValue(vi.fn())
  mocks.syncTheme.mockReset()
  mocks.changeLanguage.mockReset()
})

describe('registerLinkAppSyncHandlers', () => {
  it('theme 广播转发到 useTheme.syncTheme', async () => {
    const { registerLinkAppSyncHandlers } = await loadRegister()
    registerLinkAppSyncHandlers()

    const handler = mocks.onSync.mock.calls[0][0]
    handler({ type: 'theme', payload: 'dark' })

    expect(mocks.syncTheme).toHaveBeenCalledWith('dark')
    expect(mocks.changeLanguage).not.toHaveBeenCalled()
  })

  it('i18n 广播切换语言并记录最近广播', async () => {
    const { registerLinkAppSyncHandlers, getLastSyncedLanguage } = await loadRegister()
    registerLinkAppSyncHandlers()

    const handler = mocks.onSync.mock.calls[0][0]
    handler({ type: 'i18n', payload: 'en' })

    expect(mocks.changeLanguage).toHaveBeenCalledWith('en')
    expect(mocks.syncTheme).not.toHaveBeenCalled()
    expect(getLastSyncedLanguage()).toBe('en')
  })

  it('注销后清空最近广播语言', async () => {
    const { registerLinkAppSyncHandlers, getLastSyncedLanguage } = await loadRegister()
    const off = registerLinkAppSyncHandlers()

    mocks.onSync.mock.calls[0][0]({ type: 'i18n', payload: 'en' })
    expect(getLastSyncedLanguage()).toBe('en')

    off()
    expect(getLastSyncedLanguage()).toBeNull()
  })

  it('重复注册只订阅一次，注销后可重新注册', async () => {
    const { registerLinkAppSyncHandlers } = await loadRegister()
    const off = registerLinkAppSyncHandlers()
    registerLinkAppSyncHandlers()
    expect(mocks.onSync).toHaveBeenCalledTimes(1)

    off()
    registerLinkAppSyncHandlers()
    expect(mocks.onSync).toHaveBeenCalledTimes(2)
  })
})

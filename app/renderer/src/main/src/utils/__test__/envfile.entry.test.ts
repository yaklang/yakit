import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type * as ElectronBridgeModule from '@/services/electronBridge'

const { infoMock } = vi.hoisted(() => ({ infoMock: vi.fn() }))

vi.mock('@/utils/notification', () => ({ info: infoMock }))

function mockRelease(setEditionRaw: () => Promise<unknown>) {
  vi.doMock('@/services/electronBridge', async (importOriginal) => ({
    ...(await importOriginal<typeof ElectronBridgeModule>()),
    yakitRelease: { setEditionRaw },
  }))
}

describe('envfile release edition sync', () => {
  beforeEach(() => {
    vi.resetModules()
    infoMock.mockReset()
    delete window.__YAKIT_ENTRY__
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.doUnmock('@/services/electronBridge')
    delete window.__YAKIT_ENTRY__
  })

  it('link 入口缺少构建期版本时不覆盖主进程版本缓存', async () => {
    const setEditionRaw = vi.fn(() => Promise.resolve())
    mockRelease(setEditionRaw)
    window.__YAKIT_ENTRY__ = 'link'
    vi.stubEnv('YAKIT_EDITION', '')

    await import('@/utils/envfile')

    expect(setEditionRaw).not.toHaveBeenCalled()
  }, 15000)

  it('link 入口有构建期版本时仍同步版本', async () => {
    const setEditionRaw = vi.fn(() => Promise.resolve())
    mockRelease(setEditionRaw)
    window.__YAKIT_ENTRY__ = 'link'
    vi.stubEnv('YAKIT_EDITION', 'yakitEE')

    await import('@/utils/envfile')

    expect(setEditionRaw).toHaveBeenCalledWith('yakitEE')
  }, 15000)

  it('link 入口 yakitSE 不在启动窗口弹未翻译的版本设置提示', async () => {
    const setEditionRaw = vi.fn(() => Promise.resolve())
    mockRelease(setEditionRaw)
    window.__YAKIT_ENTRY__ = 'link'
    vi.stubEnv('YAKIT_EDITION', 'yakitSE')

    await import('@/utils/envfile')
    await Promise.resolve()
    await Promise.resolve()

    expect(setEditionRaw).toHaveBeenCalledWith('yakitSE')
    expect(infoMock).not.toHaveBeenCalled()
  }, 15000)

  it('主窗口入口保持原有同步行为', async () => {
    const setEditionRaw = vi.fn(() => Promise.resolve())
    mockRelease(setEditionRaw)
    vi.stubEnv('YAKIT_EDITION', 'yakit')

    await import('@/utils/envfile')

    expect(setEditionRaw).toHaveBeenCalledWith('yakit')
  }, 15000)
})

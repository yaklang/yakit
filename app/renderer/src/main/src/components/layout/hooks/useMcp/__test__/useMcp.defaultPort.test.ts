import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/services/electronBridge', () => ({
  yakitStream: {
    onData: vi.fn(() => vi.fn()),
    onError: vi.fn(() => vi.fn()),
    onEnd: vi.fn(() => vi.fn()),
    cancel: vi.fn(),
  },
  yakitMcp: { startServer: vi.fn() },
}))

vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({ t: (key: string) => key, i18nRefresh: 0 }),
}))

vi.mock('@/utils/kv', () => ({
  getRemoteValue: vi.fn(),
  setRemoteValue: vi.fn(),
}))

vi.mock('@/utils/notification', () => ({
  yakitNotify: vi.fn(),
}))

describe('MCP 默认端口按版本区分', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it.each([
    ['yakit', 11432],
    ['yakitEE', 11432],
    ['yakitSE', 11432],
    ['irify', 11430],
    ['irifyEE', 11430],
    ['memfit', 11433],
    ['memfitEE', 11433],
    ['breachtrace', 11432],
  ])('%s 本地 127.0.0.1、远程 0.0.0.0，端口 %s', async (edition, port) => {
    vi.stubEnv('YAKIT_EDITION', edition)
    vi.resetModules()
    const { localMcpDefalutUrl, remoteMcpDefalutUrl } = await import('../useMcp')
    expect(localMcpDefalutUrl).toBe(`127.0.0.1:${port}`)
    expect(remoteMcpDefalutUrl).toBe(`0.0.0.0:${port}`)
  })

  it('未设置版本时按 yakit', async () => {
    vi.stubEnv('YAKIT_EDITION', '')
    vi.resetModules()
    const { localMcpDefalutUrl, remoteMcpDefalutUrl } = await import('../useMcp')
    expect(localMcpDefalutUrl).toBe('127.0.0.1:11432')
    expect(remoteMcpDefalutUrl).toBe('0.0.0.0:11432')
  })
})

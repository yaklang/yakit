import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/services/yakitBridge', () => ({
  getYakitBridge: () => ({ app: {} }),
}))

vi.mock('../utils/installDroppedFilePath', () => ({
  installDroppedFilePath: vi.fn(),
}))

vi.mock('../bootstrap', () => {
  throw new Error('chunk load failed')
})

describe('engineLinkStartup entry bootstrap failure', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="root"></div>'
    vi.resetModules()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('bootstrap 加载失败时打印错误并显示 fallback', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    await import('../main')
    await vi.waitFor(() => expect(error).toHaveBeenCalledWith('[engine-link] bootstrap failed', expect.any(Error)))

    expect(document.getElementById('root')?.textContent).toBe('Link 启动页加载失败')
  })
})

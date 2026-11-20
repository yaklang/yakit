import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({
  bridge: undefined as unknown,
  bootstrapped: false,
}))

vi.mock('@/services/yakitBridge', () => ({
  getYakitBridge: () => state.bridge,
}))

vi.mock('../utils/installDroppedFilePath', () => ({
  installDroppedFilePath: vi.fn(),
}))

vi.mock('../bootstrap', () => {
  state.bootstrapped = true
  return {}
})

describe('engineLinkStartup entry', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="root"></div>'
    state.bridge = undefined
    state.bootstrapped = false
    vi.clearAllMocks()
    vi.resetModules()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('bridge 缺失时显示 fallback，且不加载 bootstrap', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const { installDroppedFilePath } = await import('../utils/installDroppedFilePath')

    await import('../main')

    expect(error).toHaveBeenCalledWith('[engine-link] missing bridge capabilities: yakitBridge')
    expect(document.getElementById('root')?.textContent).toContain('yakitBridge')
    expect(state.bootstrapped).toBe(false)
    expect(installDroppedFilePath).not.toHaveBeenCalled()
  })

  it('bridge 存在时安装 File.path 并加载 bootstrap', async () => {
    const getPathForFile = vi.fn(() => 'C:/workspace')
    state.bridge = { app: { getPathForFile } }
    const { installDroppedFilePath } = await import('../utils/installDroppedFilePath')

    await import('../main')
    await vi.waitFor(() => expect(state.bootstrapped).toBe(true))

    expect(installDroppedFilePath).toHaveBeenCalledWith(File, getPathForFile)
  })
})

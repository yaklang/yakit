import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RemoteAIAgentGV } from '@/enums/aiAgent'

const { getRemoteValue, setRemoteValue } = vi.hoisted(() => ({
  getRemoteValue: vi.fn(async () => ''),
  setRemoteValue: vi.fn(),
}))

vi.mock('@/utils/kv', () => ({ getRemoteValue, setRemoteValue }))

describe('sideHiddenModeStore', () => {
  beforeEach(() => {
    vi.resetModules()
    getRemoteValue.mockReset()
    setRemoteValue.mockReset()
    getRemoteValue.mockResolvedValue('')
  })

  it('所有 tab 共用一份自动收起状态', async () => {
    const { isSideAutoHidden, setSideHiddenMode } = await import('../sideHiddenModeStore')
    setSideHiddenMode(false)
    expect(isSideAutoHidden()).toBe(false)
    expect(setRemoteValue).toHaveBeenCalledWith(RemoteAIAgentGV.AIAgentSideShowMode, 'false')
  })

  it('本地写入后丢弃过期 hydrate，不回跳到旧 KV', async () => {
    let resolveKv!: (value: string) => void
    getRemoteValue.mockImplementationOnce(
      () =>
        new Promise<string>((resolve) => {
          resolveKv = resolve
        }),
    )

    const { isSideAutoHidden, setSideHiddenMode } = await import('../sideHiddenModeStore')
    // 触发异步 hydrate（KV 尚未返回）
    expect(isSideAutoHidden()).toBe(false)

    // 用户先点固定：关闭自动收起
    setSideHiddenMode(false)
    expect(isSideAutoHidden()).toBe(false)

    // 过期 hydrate 带回旧值 true，不得覆盖本地
    resolveKv('true')
    await Promise.resolve()
    expect(isSideAutoHidden()).toBe(false)
  })
})

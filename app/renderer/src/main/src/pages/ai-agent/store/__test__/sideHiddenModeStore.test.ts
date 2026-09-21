import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RemoteAIAgentGV } from '@/enums/aiAgent'

const { getRemoteValue, setRemoteValue } = vi.hoisted(() => ({
  getRemoteValue: vi.fn(async () => ''),
  setRemoteValue: vi.fn(),
}))

vi.mock('@/utils/kv', () => ({ getRemoteValue, setRemoteValue }))

const { isSideAutoHidden, setSideHiddenMode } = await import('../sideHiddenModeStore')

describe('sideHiddenModeStore', () => {
  beforeEach(() => {
    setSideHiddenMode(false)
    vi.clearAllMocks()
  })

  it('所有 tab 共用一份自动收起状态', () => {
    setSideHiddenMode(false)
    expect(isSideAutoHidden()).toBe(false)
    expect(setRemoteValue).toHaveBeenCalledWith(RemoteAIAgentGV.AIAgentSideShowMode, 'false')
  })
})

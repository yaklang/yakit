import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { RemoteAIAgentGV } from '@/enums/aiAgent'

const { getRemoteValue, setRemoteValue } = vi.hoisted(() => ({
  getRemoteValue: vi.fn(async () => ''),
  setRemoteValue: vi.fn(),
}))

vi.mock('@/utils/kv', () => ({ getRemoteValue, setRemoteValue }))

describe('welcomeAnimationStore', () => {
  beforeEach(() => {
    vi.resetModules()
    getRemoteValue.mockReset().mockResolvedValue('')
    setRemoteValue.mockReset()
  })

  afterEach(cleanup)

  it.each(['', 'false', 'invalid'])('默认及非 true 缓存值 %s 都启用动画', async (value) => {
    getRemoteValue.mockResolvedValue(value)
    const { useWelcomeAnimationDisabled } = await import('../welcomeAnimationStore')
    const { result } = renderHook(useWelcomeAnimationDisabled)
    expect(result.current).toBe(false)
    await act(async () => {})
    expect(result.current).toBe(false)
    expect(getRemoteValue).toHaveBeenCalledWith(RemoteAIAgentGV.WelcomeAnimationDisabled)
    expect(setRemoteValue).not.toHaveBeenCalled()
  })

  it('保留已保存的关闭动画选择', async () => {
    getRemoteValue.mockResolvedValue('true')
    const { useWelcomeAnimationDisabled } = await import('../welcomeAnimationStore')
    const { result } = renderHook(useWelcomeAnimationDisabled)
    await act(async () => {})
    expect(result.current).toBe(true)
    expect(setRemoteValue).not.toHaveBeenCalled()
  })

  it('读取 false 启用动画，切换即时同步所有订阅并独立持久化', async () => {
    getRemoteValue.mockResolvedValue('false')
    const { useWelcomeAnimationDisabled, setWelcomeAnimationDisabled } = await import('../welcomeAnimationStore')
    const first = renderHook(useWelcomeAnimationDisabled)
    const second = renderHook(useWelcomeAnimationDisabled)
    await act(async () => {})
    expect(first.result.current).toBe(false)
    expect(second.result.current).toBe(false)
    expect(getRemoteValue).toHaveBeenCalledTimes(1)
    act(() => setWelcomeAnimationDisabled(true))
    expect(first.result.current).toBe(true)
    expect(second.result.current).toBe(true)
    expect(setRemoteValue).toHaveBeenLastCalledWith(RemoteAIAgentGV.WelcomeAnimationDisabled, 'true')
    act(() => setWelcomeAnimationDisabled(false))
    expect(setRemoteValue).toHaveBeenLastCalledWith(RemoteAIAgentGV.WelcomeAnimationDisabled, 'false')
  })

  it('迟到的缓存读取不能覆盖本地切换', async () => {
    let resolveKv!: (value: string) => void
    getRemoteValue.mockImplementationOnce(
      () =>
        new Promise<string>((resolve) => {
          resolveKv = resolve
        }),
    )
    const { useWelcomeAnimationDisabled, setWelcomeAnimationDisabled } = await import('../welcomeAnimationStore')
    const { result } = renderHook(useWelcomeAnimationDisabled)
    act(() => setWelcomeAnimationDisabled(false))
    await act(async () => resolveKv('true'))
    expect(result.current).toBe(false)
  })

  it('读取失败时保留默认启用状态', async () => {
    getRemoteValue.mockRejectedValueOnce(new Error('unavailable'))
    const { useWelcomeAnimationDisabled } = await import('../welcomeAnimationStore')
    const { result } = renderHook(useWelcomeAnimationDisabled)
    await act(async () => {})
    expect(result.current).toBe(false)
  })
})

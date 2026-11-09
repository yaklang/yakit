import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

type UsageActivity = {
  foreground: boolean
  lastActivityAt: number
  revision: number
}

const mocks = vi.hoisted(() => ({
  getUsageActivity: vi.fn(),
  onUsageActivity: vi.fn(),
  visitorsStatisticsFun: vi.fn(),
}))

vi.mock('@/services/electronBridge', () => ({
  yakitApp: {
    getUsageActivity: mocks.getUsageActivity,
    onUsageActivity: mocks.onUsageActivity,
  },
}))

vi.mock('@/utils/visitorsStatistics', () => ({
  visitorsStatisticsFun: mocks.visitorsStatisticsFun,
}))

import { useEnterpriseUsageStatistics } from '../useEnterpriseUsageStatistics'

let sentCalls: Array<[token?: string, form?: string]>
const heartbeatCalls = () => mocks.visitorsStatisticsFun.mock.calls.filter(([, form]) => form === undefined)
const sentLoginCalls = () => sentCalls.filter(([, form]) => form === 'login')

describe('useEnterpriseUsageStatistics', () => {
  let activity: UsageActivity
  let listener: ((value: UsageActivity) => void) | undefined
  let unsubscribe: ReturnType<typeof vi.fn>

  const emitActivity = async (next: UsageActivity) => {
    activity = next
    await act(async () => {
      listener?.(next)
      await Promise.resolve()
    })
  }

  const mount = async (props = { collectData: true, isLogin: true, token: 'token-a' }) => {
    const hook = renderHook(
      ({ collectData, isLogin, token }) => useEnterpriseUsageStatistics(collectData, isLogin, token),
      { initialProps: props },
    )
    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })
    return hook
  }

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(0)
    activity = { foreground: true, lastActivityAt: 0, revision: 1 }
    sentCalls = []
    listener = undefined
    unsubscribe = vi.fn()
    mocks.getUsageActivity.mockReset().mockImplementation(async () => activity)
    mocks.onUsageActivity.mockReset().mockImplementation((callback: (value: UsageActivity) => void) => {
      listener = callback
      unsubscribe = vi.fn()
      return unsubscribe
    })
    mocks.visitorsStatisticsFun
      .mockReset()
      .mockImplementation(async (token?: string, form?: string, canSend?: () => boolean | Promise<boolean>) => {
        if (canSend && !(await canSend())) return false
        sentCalls.push([token, form])
        return true
      })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('前台活跃时每 60 秒上报，并在恰好 30 分钟边界停止', async () => {
    await mount()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_799_999)
    })
    expect(heartbeatCalls()).toHaveLength(29)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1)
    })
    expect(heartbeatCalls()).toHaveLength(29)
  })

  it('真实活动快照续期，但输入事件不推迟已排定的心跳', async () => {
    await mount()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_790_000)
    })
    expect(heartbeatCalls()).toHaveLength(29)

    await emitActivity({ foreground: true, lastActivityAt: 1_790_000, revision: 2 })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000)
    })
    expect(heartbeatCalls()).toHaveLength(30)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_789_999)
    })
    expect(heartbeatCalls()).toHaveLength(59)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1)
    })
    expect(heartbeatCalls()).toHaveLength(59)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000)
    })
    expect(heartbeatCalls()).toHaveLength(59)
  })

  it('失焦立即暂停，恢复后重新等待 60 秒且不补发', async () => {
    await mount()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000)
    })
    expect(heartbeatCalls()).toHaveLength(1)

    await emitActivity({ foreground: false, lastActivityAt: 60_000, revision: 2 })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(120_000)
    })
    expect(heartbeatCalls()).toHaveLength(1)

    await emitActivity({ foreground: true, lastActivityAt: 60_000, revision: 3 })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(59_999)
    })
    expect(heartbeatCalls()).toHaveLength(1)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1)
    })
    expect(heartbeatCalls()).toHaveLength(2)
  })

  it('闲置超过 30 分钟后仅恢复前台仍暂停，真实活动后才重新等待 60 秒', async () => {
    await mount()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_800_000)
    })
    expect(heartbeatCalls()).toHaveLength(29)

    await emitActivity({ foreground: false, lastActivityAt: 0, revision: 2 })
    await emitActivity({ foreground: true, lastActivityAt: 0, revision: 3 })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000)
    })
    expect(heartbeatCalls()).toHaveLength(29)

    await emitActivity({ foreground: true, lastActivityAt: 1_860_000, revision: 4 })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(59_999)
    })
    expect(heartbeatCalls()).toHaveLength(29)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1)
    })
    expect(heartbeatCalls()).toHaveLength(30)
  })

  it('忽略迟到的旧 revision 初始快照', async () => {
    let resolveInitial!: (value: UsageActivity) => void
    mocks.getUsageActivity.mockImplementationOnce(
      () => new Promise<UsageActivity>((resolve) => (resolveInitial = resolve)),
    )
    await mount()

    await emitActivity({ foreground: false, lastActivityAt: 0, revision: 2 })
    await act(async () => {
      resolveInitial({ foreground: true, lastActivityAt: 0, revision: 1 })
      await Promise.resolve()
      await vi.advanceTimersByTimeAsync(60_000)
    })
    expect(heartbeatCalls()).toHaveLength(0)
  })

  it('焦点和采集开关变化不重复登录事件，token 变化才发送新登录事件', async () => {
    const hook = await mount()
    expect(sentLoginCalls()).toHaveLength(1)

    await emitActivity({ foreground: false, lastActivityAt: 0, revision: 2 })
    await emitActivity({ foreground: true, lastActivityAt: 1, revision: 3 })
    expect(sentLoginCalls()).toHaveLength(1)

    await act(async () => {
      hook.rerender({ collectData: false, isLogin: true, token: 'token-a' })
      await Promise.resolve()
    })
    await act(async () => {
      hook.rerender({ collectData: true, isLogin: true, token: 'token-a' })
      await Promise.resolve()
    })
    expect(sentLoginCalls()).toHaveLength(1)

    await act(async () => {
      hook.rerender({ collectData: true, isLogin: true, token: 'token-b' })
      await Promise.resolve()
    })
    expect(sentLoginCalls()).toHaveLength(2)
    expect(sentLoginCalls()[1][0]).toBe('token-b')
  })

  it('退出、关闭采集、token 变化和卸载都会清理旧订阅与定时器', async () => {
    const hook = await mount()
    const firstUnsubscribe = unsubscribe

    await act(async () => {
      hook.rerender({ collectData: true, isLogin: false, token: 'token-a' })
      await Promise.resolve()
    })
    const callsAfterLogout = heartbeatCalls().length
    await act(async () => {
      await vi.advanceTimersByTimeAsync(120_000)
    })
    expect(firstUnsubscribe).toHaveBeenCalledOnce()
    expect(heartbeatCalls()).toHaveLength(callsAfterLogout)

    await act(async () => {
      hook.rerender({ collectData: true, isLogin: true, token: 'token-a' })
      await Promise.resolve()
    })
    const secondUnsubscribe = unsubscribe
    await act(async () => {
      hook.rerender({ collectData: false, isLogin: true, token: 'token-a' })
      await Promise.resolve()
    })
    const callsAfterCollectDisabled = heartbeatCalls().length
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000)
    })
    expect(secondUnsubscribe).toHaveBeenCalledOnce()
    expect(heartbeatCalls()).toHaveLength(callsAfterCollectDisabled)

    await act(async () => {
      hook.rerender({ collectData: true, isLogin: true, token: 'token-a' })
      await Promise.resolve()
    })
    const thirdUnsubscribe = unsubscribe
    await act(async () => {
      hook.rerender({ collectData: true, isLogin: true, token: 'token-b' })
      await Promise.resolve()
    })
    expect(thirdUnsubscribe).toHaveBeenCalledOnce()

    const fourthUnsubscribe = unsubscribe
    hook.unmount()
    expect(fourthUnsubscribe).toHaveBeenCalledOnce()
    const callsAfterUnmount = heartbeatCalls().length
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000)
    })
    expect(heartbeatCalls()).toHaveLength(callsAfterUnmount)
  })

  it('上一请求未结束时不会创建并发心跳', async () => {
    let resolveHeartbeat!: (value: boolean) => void
    mocks.visitorsStatisticsFun.mockImplementation(
      (_token?: string, form?: string, canSend?: () => boolean | Promise<boolean>) => {
        if (form === 'login') return Promise.resolve(canSend?.() ?? true)
        return new Promise<boolean>((resolve) => (resolveHeartbeat = resolve))
      },
    )
    await mount()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(180_000)
    })
    expect(heartbeatCalls()).toHaveLength(1)

    await act(async () => {
      resolveHeartbeat(true)
      await Promise.resolve()
      await vi.advanceTimersByTimeAsync(60_000)
    })
    expect(heartbeatCalls()).toHaveLength(2)
  })

  it('暂停再恢复后旧周期的延迟 guard 失效，新周期仍完整等待 60 秒', async () => {
    const heartbeatGuards: Array<() => boolean | Promise<boolean>> = []
    const resolveHeartbeats: Array<(value: boolean) => void> = []
    mocks.visitorsStatisticsFun.mockImplementation(
      async (token?: string, form?: string, canSend?: () => boolean | Promise<boolean>) => {
        if (form === 'login') {
          if (canSend && !(await canSend())) return false
          sentCalls.push([token, form])
          return true
        }
        heartbeatGuards.push(canSend!)
        return new Promise<boolean>((resolve) => resolveHeartbeats.push(resolve))
      },
    )
    await mount()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000)
    })
    expect(heartbeatGuards).toHaveLength(1)

    await emitActivity({ foreground: false, lastActivityAt: 0, revision: 2 })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000)
    })
    await emitActivity({ foreground: true, lastActivityAt: 0, revision: 3 })

    await expect(heartbeatGuards[0]()).resolves.toBe(false)
    await act(async () => {
      resolveHeartbeats[0](false)
      await Promise.resolve()
      await vi.advanceTimersByTimeAsync(59_999)
    })
    expect(heartbeatGuards).toHaveLength(1)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1)
    })
    expect(heartbeatGuards).toHaveLength(2)
  })
})

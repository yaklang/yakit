import { describe, expect, it, vi } from 'vitest'
// 先注册 electron stub，避免 import 路径上的顶层 require('electron') 报错
import '../../../ai-re-act/hooks/__test__/setupElectron'
import emiter from '@/utils/eventBus/eventBus'
import { waitForAISessionPush } from '../waitForAISessionPush'

describe('waitForAISessionPush', () => {
  it('超时后 resolve undefined', async () => {
    vi.useFakeTimers()
    const promise = waitForAISessionPush(1000)
    vi.advanceTimersByTime(1000)
    await expect(promise).resolves.toBeUndefined()
    vi.useRealTimers()
  })

  it('收到后端推送后 resolve sessionId', async () => {
    vi.useFakeTimers()
    const promise = waitForAISessionPush(2000)
    // 模拟 duplex 推送格式：{ sessionId: 's-1', isRunning: true }
    emiter.emit('onServerPushAISession', JSON.stringify({ sessionId: 's-1', isRunning: true }))
    await expect(promise).resolves.toBe('s-1')
    vi.useRealTimers()
  })

  it('收到非法 JSON 推送时兜底 resolve undefined', async () => {
    vi.useFakeTimers()
    const promise = waitForAISessionPush(2000)
    emiter.emit('onServerPushAISession', 'not-json')
    await expect(promise).resolves.toBeUndefined()
    vi.useRealTimers()
  })
})

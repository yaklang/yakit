import { act, renderHook } from '@testing-library/react'
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { useMessageUnread } from '../useMessageUnread'
import emiter from '@/utils/eventBus/eventBus'

const { userInfo, edition, queryMessage, queryWeb } = vi.hoisted(() => ({
  userInfo: { isLogin: true, platform: 'github', user_id: 1, token: 'first' },
  edition: { enterprise: false },
  queryMessage: vi.fn(),
  queryWeb: vi.fn(),
}))

vi.mock('@/store', () => ({ useStore: () => ({ userInfo }) }))
vi.mock('@/utils/envfile', () => ({ isEnpriTrace: () => edition.enterprise }))
vi.mock('../utils', () => ({ apiFetchQueryMessage: queryMessage, apiFetchQueryWebMessage: queryWeb }))
vi.mock('@/utils/notification', () => ({ failed: vi.fn() }))

const unread = { data: [{ isRead: false }] }
const empty = { data: [] }
const flush = () =>
  act(async () => {
    await Promise.resolve()
  })

beforeEach(() => {
  vi.useFakeTimers()
  userInfo.isLogin = true
  userInfo.token = 'first'
  edition.enterprise = false
  queryMessage.mockReset().mockResolvedValue(empty)
  queryWeb.mockReset().mockResolvedValue(empty)
})

afterEach(() => vi.useRealTimers())

describe('头像消息未读状态', () => {
  it('社区版只查询插件未读，推送立即显示红点，刷新后按服务端状态消点', async () => {
    const { result } = renderHook(useMessageUnread)
    await flush()
    expect(queryMessage).toHaveBeenCalledWith({ page: 1, limit: 20 }, { isRead: 'false' })
    expect(queryWeb).not.toHaveBeenCalled()
    expect(result.current).toBe(false)
    act(() => emiter.emit('onRefreshMessageSocket', JSON.stringify({ isRead: false })))
    expect(result.current).toBe(true)
    act(() => emiter.emit('onRefreshMessageUnread'))
    await flush()
    expect(result.current).toBe(false)
  })

  it('企业版合并两个通道，系统通知每分钟轮询，任一未读仍显示红点', async () => {
    edition.enterprise = true
    queryWeb.mockResolvedValue(unread)
    const { result } = renderHook(useMessageUnread)
    await flush()
    expect(result.current).toBe(true)
    queryMessage.mockResolvedValue(unread)
    queryWeb.mockResolvedValue(empty)
    act(() => emiter.emit('onRefreshMessageUnread'))
    await flush()
    expect(result.current).toBe(true)
    const pluginCalls = queryMessage.mock.calls.length
    act(() => vi.advanceTimersByTime(60_000))
    await flush()
    expect(queryWeb).toHaveBeenCalledTimes(3)
    expect(queryMessage).toHaveBeenCalledTimes(pluginCalls)
  })

  it('查询失败保留已有未读状态', async () => {
    queryMessage.mockResolvedValue(unread)
    const { result } = renderHook(useMessageUnread)
    await flush()
    queryMessage.mockRejectedValue(new Error('offline'))
    act(() => emiter.emit('onRefreshMessageUnread'))
    await flush()
    expect(result.current).toBe(true)
  })

  it('忽略早于新推送发起的查询结果', async () => {
    let resolve!: (value: typeof empty) => void
    queryMessage.mockReturnValue(
      new Promise((done) => {
        resolve = done
      }),
    )
    const { result } = renderHook(useMessageUnread)
    act(() => emiter.emit('onRefreshMessageSocket', JSON.stringify({ isRead: false })))
    await act(async () => resolve(empty))
    expect(result.current).toBe(true)
  })

  it('切换账号清除状态且忽略旧请求，退出后停止查询和推送', async () => {
    let resolve!: (value: typeof unread) => void
    queryMessage.mockReturnValueOnce(
      new Promise((done) => {
        resolve = done
      }),
    )
    const { result, rerender } = renderHook(useMessageUnread)
    act(() => emiter.emit('onRefreshMessageSocket', JSON.stringify({ isRead: false })))
    userInfo.token = 'second'
    rerender()
    await flush()
    await act(async () => resolve(unread))
    expect(result.current).toBe(false)
    act(() => emiter.emit('onRefreshMessageSocket', JSON.stringify({ isRead: false })))
    expect(result.current).toBe(true)
    userInfo.isLogin = false
    rerender()
    const calls = queryMessage.mock.calls.length
    act(() => {
      emiter.emit('onRefreshMessageSocket', JSON.stringify({ isRead: false }))
      emiter.emit('onRefreshMessageUnread')
      vi.advanceTimersByTime(60_000)
    })
    expect(result.current).toBe(false)
    expect(queryMessage).toHaveBeenCalledTimes(calls)
  })

  it('卸载后取消轮询和刷新监听', async () => {
    edition.enterprise = true
    const { unmount } = renderHook(useMessageUnread)
    await flush()
    unmount()
    act(() => {
      emiter.emit('onRefreshMessageUnread')
      vi.advanceTimersByTime(60_000)
    })
    expect(queryWeb).toHaveBeenCalledTimes(1)
    expect(queryMessage).toHaveBeenCalledTimes(1)
  })
})

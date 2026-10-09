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

const response = (total: number, data = total > 0 ? [{ isRead: false }] : []) => ({
  data,
  pagemeta: { page: 1, limit: 20, total },
})
const unread = response(1)
const empty = response(0)
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

describe('头像消息未读总数', () => {
  it('社区版按分页总量统计插件未读，不受首屏数据条数限制', async () => {
    queryMessage.mockResolvedValue(
      response(
        37,
        Array.from({ length: 20 }, () => ({ isRead: false })),
      ),
    )
    const { result } = renderHook(useMessageUnread)
    await flush()
    expect(queryMessage).toHaveBeenCalledWith({ page: 1, limit: 20 }, { isRead: 'false' })
    expect(queryWeb).not.toHaveBeenCalled()
    expect(result.current).toBe(37)
  })

  it('企业版合并两个通道的总数，并每分钟轮询系统通知', async () => {
    edition.enterprise = true
    queryMessage.mockResolvedValue(response(23))
    queryWeb.mockResolvedValue(response(81))
    const { result } = renderHook(useMessageUnread)
    await flush()
    expect(result.current).toBe(104)
    queryMessage.mockResolvedValue(response(6))
    queryWeb.mockResolvedValue(response(4))
    act(() => emiter.emit('onRefreshMessageUnread'))
    await flush()
    expect(result.current).toBe(10)
    const pluginCalls = queryMessage.mock.calls.length
    act(() => vi.advanceTimersByTime(60_000))
    await flush()
    expect(queryWeb).toHaveBeenCalledTimes(3)
    expect(queryMessage).toHaveBeenCalledTimes(pluginCalls)
  })

  it('查询失败保留最近一次成功的未读总数', async () => {
    queryMessage.mockResolvedValue(response(28))
    const { result } = renderHook(useMessageUnread)
    await flush()
    queryMessage.mockRejectedValue(new Error('offline'))
    act(() => emiter.emit('onRefreshMessageUnread'))
    await flush()
    expect(result.current).toBe(28)
  })

  it('推送立即保底未读并触发权威重查，重复推送不累加且旧响应不能覆盖', async () => {
    let resolveInitial!: (value: typeof empty) => void
    let resolveFirstRefresh!: (value: typeof empty) => void
    let resolveLatestRefresh!: (value: typeof empty) => void
    queryMessage
      .mockReturnValueOnce(
        new Promise((done) => {
          resolveInitial = done
        }),
      )
      .mockReturnValueOnce(
        new Promise((done) => {
          resolveFirstRefresh = done
        }),
      )
      .mockReturnValueOnce(
        new Promise((done) => {
          resolveLatestRefresh = done
        }),
      )
    const { result } = renderHook(useMessageUnread)
    act(() => {
      emiter.emit('onRefreshMessageSocket', JSON.stringify({ isRead: false }))
      emiter.emit('onRefreshMessageSocket', JSON.stringify({ isRead: false }))
    })
    expect(result.current).toBe(1)
    expect(queryMessage).toHaveBeenCalledTimes(3)
    await act(async () => resolveLatestRefresh(response(9)))
    expect(result.current).toBe(9)
    await act(async () => {
      resolveInitial(response(2))
      resolveFirstRefresh(response(30))
    })
    expect(result.current).toBe(9)
  })

  it('无效或已读推送不改变总数也不触发查询', async () => {
    queryMessage.mockResolvedValue(response(3))
    const { result } = renderHook(useMessageUnread)
    await flush()
    const calls = queryMessage.mock.calls.length
    act(() => {
      emiter.emit('onRefreshMessageSocket', 'invalid')
      emiter.emit('onRefreshMessageSocket', JSON.stringify({ isRead: true }))
    })
    expect(result.current).toBe(3)
    expect(queryMessage).toHaveBeenCalledTimes(calls)
  })

  it('刷新后按服务端权威总数清除推送保底值', async () => {
    let resolveRefresh!: (value: typeof empty) => void
    queryMessage.mockResolvedValueOnce(empty).mockReturnValueOnce(
      new Promise((done) => {
        resolveRefresh = done
      }),
    )
    const { result } = renderHook(useMessageUnread)
    await flush()
    act(() => emiter.emit('onRefreshMessageSocket', JSON.stringify({ isRead: false })))
    expect(result.current).toBe(1)
    await act(async () => resolveRefresh(empty))
    expect(result.current).toBe(0)
  })

  it('切换账号即使新查询失败也清除状态并忽略旧请求，退出后停止查询和推送', async () => {
    let resolve!: (value: typeof unread) => void
    queryMessage.mockReturnValueOnce(
      new Promise((done) => {
        resolve = done
      }),
    )
    const { result, rerender } = renderHook(useMessageUnread)
    act(() => emiter.emit('onRefreshMessageSocket', JSON.stringify({ isRead: false })))
    queryMessage.mockRejectedValue(new Error('new account offline'))
    userInfo.token = 'second'
    rerender()
    await flush()
    await act(async () => resolve(unread))
    expect(result.current).toBe(0)
    act(() => emiter.emit('onRefreshMessageSocket', JSON.stringify({ isRead: false })))
    expect(result.current).toBe(1)
    userInfo.isLogin = false
    rerender()
    const calls = queryMessage.mock.calls.length
    act(() => {
      emiter.emit('onRefreshMessageSocket', JSON.stringify({ isRead: false }))
      emiter.emit('onRefreshMessageUnread')
      vi.advanceTimersByTime(60_000)
    })
    expect(result.current).toBe(0)
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

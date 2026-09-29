import { useState } from 'react'
import { useGetState } from 'ahooks'
import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { YakitRoute } from '@/enums/yakitRoute'
import type { ComponentParams } from '@/routes/newRoute'
import type { PageCache } from '../MainOperatorContentType'
import { useOpenAIAgentPage } from '../useOpenAIAgentPage'

const engine = vi.hoisted(() => ({
  getSessionPageId: vi.fn<(sessionId: string, route: YakitRoute) => string | undefined>(),
  waitForSessionPageId: vi.fn<(sessionId: string, route: YakitRoute) => Promise<string | undefined>>(),
}))
vi.mock('@/pages/ai-re-act/hooks/ChatMultiSessionController', () => ({ globalSessionEngine: engine }))

beforeEach(() => {
  vi.resetAllMocks()
  engine.waitForSessionPageId.mockResolvedValue(undefined)
})
afterEach(cleanup)

function history(sessionId: string): ComponentParams {
  return {
    aiAgentPageInfo: {
      session: {
        Id: sessionId,
        SessionID: sessionId,
        Title: sessionId,
        question: '',
        CreatedAt: 0,
        UpdatedAt: 0,
        LastUsedAt: 0,
        TitleInitialized: true,
        Source: 'ai',
      },
    },
  }
}

function tab(routeKey: string, pageParams?: ComponentParams): PageCache {
  return {
    routeKey,
    route: YakitRoute.AI_Agent,
    verbose: routeKey,
    menuName: 'AI Agent',
    singleNode: true,
    multipleNode: [],
    pageParams,
  }
}

function deferIdentity() {
  let resolve!: (pageId?: string) => void
  const promise = new Promise<string | undefined>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

function setup(initialPages: PageCache[] = []) {
  const navigate = vi.fn()
  const openTab = vi.fn<(params?: ComponentParams) => void>()
  const hook = renderHook(() => {
    const [pageCache, setPageCache, getPageCache] = useGetState(initialPages)
    const [currentTabKey, setCurrentTabKey] = useState('source-tab')
    const open = useOpenAIAgentPage({
      pageCache,
      getPageCache,
      currentTabKey,
      setCurrentTabKey: (key) => {
        navigate(key)
        setCurrentTabKey(key)
      },
      openAIAgentExtraTab: openTab,
    })
    return { open, setPageCache, setCurrentTabKey }
  })
  return { ...hook, navigate, openTab }
}

describe('AI Agent 页面异步打开', () => {
  it.each(['会话 ID', 'pending 页面 ID', 'routeKey 回退'])('通过%s立即定位已有 Tab，不等待握手', async (match) => {
    const pages = [
      tab(
        'existing-tab',
        match === '会话 ID' ? history('session') : match === 'pending 页面 ID' ? { id: 'owner' } : undefined,
      ),
    ]
    if (match !== '会话 ID')
      engine.getSessionPageId.mockReturnValue(match === 'pending 页面 ID' ? 'owner' : 'existing-tab')
    const { result, navigate, openTab } = setup(pages)
    await act(async () => result.current.open(history('session')))
    expect(navigate).toHaveBeenCalledExactlyOnceWith('existing-tab')
    expect(engine.waitForSessionPageId).not.toHaveBeenCalled()
    expect(openTab).not.toHaveBeenCalled()
  })

  it('身份未知时暂缓打开，判定无已有 Tab 后携带原历史参数新开', async () => {
    const identity = deferIdentity()
    engine.waitForSessionPageId.mockReturnValue(identity.promise)
    const { result, navigate, openTab } = setup()
    const params = history('history')
    const opening = result.current.open(params)
    expect(engine.waitForSessionPageId).toHaveBeenCalledWith('history', YakitRoute.AI_Agent)
    expect(openTab).not.toHaveBeenCalled()
    expect(navigate).not.toHaveBeenCalled()
    await act(async () => {
      identity.resolve()
      await opening
    })
    expect(openTab).toHaveBeenCalledExactlyOnceWith(params)
  })

  it.each(['会话 ID', 'pending 页面 ID'])('等待结束按%s复用最新缓存，不使用等待前的页签列表', async (match) => {
    const identity = deferIdentity()
    engine.waitForSessionPageId.mockReturnValue(identity.promise)
    const { result, navigate, openTab } = setup()
    const opening = result.current.open(history('history'))
    act(() => {
      // 页签缓存已更新，但等待中的回调仍来自旧渲染，需通过 getter 读取最新值。
      result.current.setPageCache([
        tab('newly-visible-tab', match === '会话 ID' ? history('history') : { id: 'owner' }),
      ])
    })
    await act(async () => {
      identity.resolve(match === 'pending 页面 ID' ? 'owner' : undefined)
      await opening
    })
    expect(navigate).toHaveBeenCalledExactlyOnceWith('newly-visible-tab')
    expect(openTab).not.toHaveBeenCalled()
  })

  it('等待期间目标 Tab 被关闭，身份返回后不会跳转到已移除页签', async () => {
    const identity = deferIdentity()
    engine.waitForSessionPageId.mockReturnValue(identity.promise)
    const { result, navigate, openTab } = setup([tab('pending-tab')])
    const params = history('history')
    const opening = result.current.open(params)
    act(() => result.current.setPageCache([]))
    await act(async () => {
      identity.resolve('pending-tab')
      await opening
    })
    expect(navigate).not.toHaveBeenCalled()
    expect(openTab).toHaveBeenCalledExactlyOnceWith(params)
  })

  it.each(['旧请求先返回', '新请求先返回'])('连续打开两个历史时只有最后一个请求可以导航（%s）', async (order) => {
    const first = deferIdentity()
    const second = deferIdentity()
    engine.waitForSessionPageId.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)
    const { result, navigate, openTab } = setup()
    const oldOpening = result.current.open(history('old'))
    const params = history('latest')
    const latestOpening = result.current.open(params)
    const completions =
      order === '旧请求先返回'
        ? ([
            [first, oldOpening],
            [second, latestOpening],
          ] as const)
        : ([
            [second, latestOpening],
            [first, oldOpening],
          ] as const)
    for (const [identity, opening] of completions) {
      await act(async () => {
        identity.resolve()
        await opening
      })
    }
    expect(openTab).toHaveBeenCalledExactlyOnceWith(params)
    expect(navigate).not.toHaveBeenCalled()
  })

  it.each(['欢迎页', '已打开历史'])('等待时打开%s使旧请求失效，包括当前 Tab 不变的情况', async (target) => {
    const identity = deferIdentity()
    engine.waitForSessionPageId.mockReturnValue(identity.promise)
    const { result, navigate, openTab } = setup([tab('source-tab', history('existing'))])
    const opening = result.current.open(history('pending'))
    await act(async () => result.current.open(target === '欢迎页' ? undefined : history('existing')))
    await act(async () => {
      identity.resolve()
      await opening
    })
    if (target === '欢迎页') {
      expect(openTab).toHaveBeenCalledExactlyOnceWith(undefined)
      expect(navigate).not.toHaveBeenCalled()
    } else {
      expect(navigate).toHaveBeenCalledExactlyOnceWith('source-tab')
      expect(openTab).not.toHaveBeenCalled()
    }
    expect(engine.waitForSessionPageId).toHaveBeenCalledTimes(1)
  })

  it.each(['切换一级 Tab', '关闭当前 Tab', '卸载页面'])('等待期间%s后不再新开或抢占页签', async (action) => {
    const identity = deferIdentity()
    engine.waitForSessionPageId.mockReturnValue(identity.promise)
    const { result, unmount, navigate, openTab } = setup([tab('source-tab'), tab('pending-tab')])
    const opening = result.current.open(history('history'))
    act(() => {
      if (action === '卸载页面') unmount()
      else {
        if (action === '关闭当前 Tab') result.current.setPageCache([tab('pending-tab')])
        result.current.setCurrentTabKey('other-tab')
      }
    })
    await act(async () => {
      identity.resolve('pending-tab')
      await opening
    })
    expect(navigate).not.toHaveBeenCalled()
    expect(openTab).not.toHaveBeenCalled()
  })
})

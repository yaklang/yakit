import { useGetState } from 'ahooks'
import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { YakitRoute } from '@/enums/yakitRoute'
import type { ComponentParams } from '@/routes/newRoute'
import type { PageCache } from '../MainOperatorContentType'
import { useOpenAIAgentPage } from '../useOpenAIAgentPage'

const engine = vi.hoisted(() => ({
  getSessionPageId: vi.fn<(sessionId: string, route: YakitRoute) => string | undefined>(),
}))
vi.mock('@/pages/ai-re-act/hooks/ChatMultiSessionController', () => ({ globalSessionEngine: engine }))

beforeEach(() => {
  vi.resetAllMocks()
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

function setup(initialPages: PageCache[] = []) {
  const navigate = vi.fn()
  const openTab = vi.fn<(params?: ComponentParams) => void>()
  const hook = renderHook(() => {
    const [, setPageCache, getPageCache] = useGetState(initialPages)
    const open = useOpenAIAgentPage({ getPageCache, setCurrentTabKey: navigate, openAIAgentExtraTab: openTab })
    return { open, setPageCache }
  })
  return { ...hook, navigate, openTab }
}

describe('AI Agent 页面按已知身份打开', () => {
  it.each(['会话 ID', 'pending 页面 ID', 'routeKey 回退'])('通过%s同步定位已有 Tab，不等待后端事件', (match) => {
    const pages = [
      tab(
        'existing-tab',
        match === '会话 ID' ? history('session') : match === 'pending 页面 ID' ? { id: 'owner' } : undefined,
      ),
    ]
    if (match !== '会话 ID')
      engine.getSessionPageId.mockReturnValue(match === 'pending 页面 ID' ? 'owner' : 'existing-tab')
    const { result, navigate, openTab } = setup(pages)
    act(() => result.current.open(history('session')))
    expect(navigate).toHaveBeenCalledExactlyOnceWith('existing-tab')
    expect(openTab).not.toHaveBeenCalled()
  })

  it('未打开的历史立即新开，不被其他 pending 会话阻塞', () => {
    const { result, navigate, openTab } = setup([tab('pending-tab')])
    const params = history('unrelated')
    act(() => result.current.open(params))
    expect(openTab).toHaveBeenCalledExactlyOnceWith(params)
    expect(navigate).not.toHaveBeenCalled()
  })

  it('使用最新页签缓存，已关闭的目标重新打开，不跳转到旧 Tab', () => {
    const { result, navigate, openTab } = setup([tab('old-tab', history('session'))])
    const open = result.current.open
    act(() => result.current.setPageCache([tab('new-tab', history('session'))]))
    act(() => open(history('session')))
    expect(navigate).toHaveBeenCalledExactlyOnceWith('new-tab')
    act(() => result.current.setPageCache([]))
    act(() => open(history('session')))
    expect(openTab).toHaveBeenCalledExactlyOnceWith(history('session'))
    expect(navigate).toHaveBeenCalledTimes(1)
  })

  it('连续打开历史和欢迎页均同步完成，不留下延迟导航', async () => {
    const { result, navigate, openTab } = setup([tab('history-tab', history('existing'))])
    act(() => {
      result.current.open(history('existing'))
      result.current.open(history('new-history'))
      result.current.open()
    })
    expect(navigate).toHaveBeenCalledExactlyOnceWith('history-tab')
    expect(openTab.mock.calls).toEqual([[history('new-history')], [undefined]])
    await act(async () => {})
    expect(navigate).toHaveBeenCalledTimes(1)
    expect(openTab).toHaveBeenCalledTimes(2)
  })

  it('不会复用其他路由下同 ID 的页签', () => {
    const { result, navigate, openTab } = setup([{ ...tab('other', history('session')), route: YakitRoute.HTTPFuzzer }])
    act(() => result.current.open(history('session')))
    expect(navigate).not.toHaveBeenCalled()
    expect(openTab).toHaveBeenCalledExactlyOnceWith(history('session'))
  })
})

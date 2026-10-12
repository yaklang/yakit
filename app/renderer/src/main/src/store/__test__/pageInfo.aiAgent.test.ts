import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { YakitRoute } from '@/enums/yakitRoute'
import { RemoteAIAgentGV } from '@/enums/aiAgent'
import { FuzzerRemoteGV } from '@/enums/fuzzer'
import type { PageNodeItemProps } from '../pageInfo'
import type * as PageInfoModule from '../pageInfo'
import type { AISession } from '@/pages/ai-agent/type/aiChat'

const kv = vi.hoisted(() => ({ set: vi.fn(), project: vi.fn() }))
vi.mock('@/utils/kv', () => ({ setRemoteValue: kv.set, setRemoteProjectValue: kv.project }))
vi.mock('@/utils/notification', () => ({ yakitNotify: vi.fn() }))
vi.mock('@/utils/tool', () => ({ JSONParseLog: JSON.parse }))
vi.mock('@/i18n/i18n', () => ({ default: { getFixedT: () => (key: string) => key } }))
vi.mock('@/defaultConstants/HTTPFuzzerPage', () => ({ defaultAdvancedConfigValue: {}, defaultPostTemplate: '' }))

const session: AISession = {
  Id: 'session-record',
  SessionID: 'session-one',
  Title: 'Conversation',
  question: 'Hello',
  CreatedAt: 1,
  UpdatedAt: 2,
  TitleInitialized: true,
  LastUsedAt: 2,
  Source: 'ai',
}
const node = (pageId: string): PageNodeItemProps => ({
  id: pageId,
  pageId,
  routeKey: YakitRoute.AI_Agent,
  pageName: pageId,
  pageGroupId: '0',
  sortFieId: 1,
  pageParamsInfo: { aiAgentPageInfo: { session } },
})

let api: typeof PageInfoModule
let unsubscribe: () => void
beforeEach(async () => {
  vi.resetModules()
  vi.useFakeTimers()
  sessionStorage.clear()
  kv.set.mockReset().mockResolvedValue(undefined)
  kv.project.mockReset().mockResolvedValue(undefined)
  api = await import('../pageInfo')
  unsubscribe = api.usePageInfo.subscribe((state) => state.pages.get(YakitRoute.AI_Agent), api.saveAIAgentCache)
})
afterEach(() => {
  unsubscribe?.()
  api.saveAIAgentCache.cancel()
  api.saveFuzzerCache.cancel()
  vi.useRealTimers()
})

const savedPages = (): PageNodeItemProps[] =>
  JSON.parse(kv.project.mock.calls.filter(([key]) => key === RemoteAIAgentGV.AIAgentTabs).at(-1)![1])

describe('AI pageInfo route persistence through existing actions', () => {
  it('saves an added page to the project cache with its existing full session metadata', () => {
    const page = node('ai-one')
    const info = { session, defualtAIMentionCommandParams: [], forgeExec: { ruleContent: 'rule' } }
    page.pageParamsInfo.aiAgentPageInfo = info
    api.usePageInfo.getState().addPagesDataCache(YakitRoute.AI_Agent, page)

    expect(api.usePageInfo.getState().queryPagesDataById(YakitRoute.AI_Agent, page.pageId)).toEqual(page)
    expect(kv.project).toHaveBeenCalledExactlyOnceWith(RemoteAIAgentGV.AIAgentTabs, JSON.stringify([page]))
    expect(savedPages()[0].pageParamsInfo.aiAgentPageInfo).toEqual(info)
    expect(kv.set).not.toHaveBeenCalled()
  })

  it('debounces title changes for 500ms and saves the latest page and session title', async () => {
    const store = api.usePageInfo.getState()
    const page = node('ai-one')
    store.addPagesDataCache(YakitRoute.AI_Agent, page)
    for (const title of ['First title', 'Final title']) {
      store.updatePagesDataCacheById(YakitRoute.AI_Agent, {
        ...page,
        pageName: title,
        pageParamsInfo: { aiAgentPageInfo: { session: { ...session, Title: title } } },
      })
    }

    await vi.advanceTimersByTimeAsync(499)
    expect(kv.project).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(1)
    expect(kv.project).toHaveBeenCalledTimes(2)
    expect(savedPages()[0].pageName).toBe('Final title')
    expect(savedPages()[0].pageParamsInfo.aiAgentPageInfo?.session).toEqual({ ...session, Title: 'Final title' })
  })

  it('saves an empty list after deleting the last page', async () => {
    const store = api.usePageInfo.getState()
    store.addPagesDataCache(YakitRoute.AI_Agent, node('ai-one'))
    store.removePagesDataCacheById(YakitRoute.AI_Agent, 'ai-one')
    await vi.advanceTimersByTimeAsync(500)

    expect(savedPages()).toEqual([])
  })

  it('saves only the retained tab when setPagesData closes other tabs', async () => {
    const store = api.usePageInfo.getState()
    store.addPagesDataCache(YakitRoute.AI_Agent, node('ai-one'))
    store.addPagesDataCache(YakitRoute.AI_Agent, node('ai-two'))
    const page = api.usePageInfo.getState().pages.get(YakitRoute.AI_Agent)!
    store.setPagesData(YakitRoute.AI_Agent, { ...page, pageList: [page.pageList[1]] })
    await vi.advanceTimersByTimeAsync(500)

    expect(savedPages().map((item) => item.pageId)).toEqual(['ai-two'])
  })

  it.each(['clearDataByRoute', 'clearAllData', 'clearOtherDataByRoute'] as const)(
    '%s also saves deletion through the route subscription',
    async (action) => {
      const store = api.usePageInfo.getState()
      store.addPagesDataCache(YakitRoute.AI_Agent, node('ai-one'))
      if (action === 'clearAllData') store.clearAllData()
      else store[action](action === 'clearDataByRoute' ? YakitRoute.AI_Agent : YakitRoute.HTTPFuzzer)
      await vi.advanceTimersByTimeAsync(500)

      expect(savedPages()).toEqual([])
    },
  )

  it.each([
    { retained: YakitRoute.HTTPFuzzer, expected: [YakitRoute.HTTPFuzzer] },
    { retained: [YakitRoute.HTTPFuzzer, YakitRoute.AI_Agent], expected: [YakitRoute.HTTPFuzzer, YakitRoute.AI_Agent] },
  ])('retains only the requested routes and their selected groups: $expected', ({ retained, expected }) => {
    const routes = [YakitRoute.AI_Agent, YakitRoute.HTTPFuzzer, YakitRoute.Settings]
    const pages = new Map(routes.map((route) => [route, { ...api.defPage, routeKey: route }]))
    api.usePageInfo.setState({
      pages,
      selectGroupId: new Map(routes.map((route) => [route, `group-${route}`])),
    })
    api.saveAIAgentCache.cancel()
    kv.project.mockClear()

    api.usePageInfo.getState().clearOtherDataByRoute(retained)

    const result = api.usePageInfo.getState()
    expect([...result.pages.keys()].sort()).toEqual([...expected].sort())
    expect([...result.selectGroupId.keys()].sort()).toEqual([...expected].sort())
    for (const route of expected) {
      expect(result.pages.get(route)).toBe(pages.get(route))
      expect(result.selectGroupId.get(route)).toBe(`group-${route}`)
    }
    if (Array.isArray(retained)) expect(kv.project).not.toHaveBeenCalled()
  })

  it('saves AI and Fuzzer independently without unrelated route changes writing either cache', async () => {
    const stopFuzzer = api.usePageInfo.subscribe(
      (state) => state.pages.get(YakitRoute.HTTPFuzzer),
      (page) => api.saveFuzzerCache(page!),
    )
    try {
      const store = api.usePageInfo.getState()
      store.addPagesDataCache(YakitRoute.AI_Agent, node('ai-one'))
      store.addPagesDataCache(YakitRoute.HTTPFuzzer, {
        ...node('fuzzer-one'),
        routeKey: YakitRoute.HTTPFuzzer,
        pageParamsInfo: {},
      })
      expect(kv.set).not.toHaveBeenCalled()
      expect(kv.project).toHaveBeenCalledTimes(2)
      expect(kv.project.mock.lastCall![0]).toBe(FuzzerRemoteGV.FuzzerCache)
      expect(JSON.parse(kv.project.mock.lastCall![1])).toEqual([expect.objectContaining({ id: 'fuzzer-one' })])

      store.addPagesDataCache(YakitRoute.Settings, { ...node('settings'), routeKey: YakitRoute.Settings })
      await vi.advanceTimersByTimeAsync(500)
      expect(kv.set).not.toHaveBeenCalled()
      expect(kv.project).toHaveBeenCalledTimes(2)
      expect(savedPages().map((item) => item.pageId)).toEqual(['ai-one'])
    } finally {
      stopFuzzer()
    }
  })
})

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { YakitRoute } from '@/enums/yakitRoute'
import type { AISession } from '@/pages/ai-agent/type/aiChat'
import type { PageNodeItemProps, PageProps } from '@/store/pageInfo'
import type { PageCache } from '../MainOperatorContentType'
import { mergeAIAgentPageTabs } from '../mergeAIAgentPageTabs'

vi.mock('@/routes/newRoute', () => ({ YakitRouteToPageInfo: { 'ai-agent': { label: 'AIAgent' } } }))
const { isMemfit } = vi.hoisted(() => ({ isMemfit: vi.fn(() => false) }))
vi.mock('@/utils/envfile', () => ({ isMemfit }))

const session = (id: string): AISession => ({
  Id: id,
  SessionID: id,
  Title: `Title ${id}`,
  question: '',
  CreatedAt: 0,
  UpdatedAt: 0,
  LastUsedAt: 0,
  TitleInitialized: true,
  Source: 'ai',
})

const node = (id: string, sessionId?: string, order = 0): PageNodeItemProps => ({
  id,
  pageId: id,
  routeKey: YakitRoute.AI_Agent,
  pageGroupId: '0',
  pageName: `Cached ${id}`,
  sortFieId: order,
  pageParamsInfo: { aiAgentPageInfo: { session: sessionId ? session(sessionId) : undefined } },
})

const tab = (id: string): PageCache => ({
  route: YakitRoute.AI_Agent,
  routeKey: id,
  verbose: `Cached ${id}`,
  menuName: 'AI Agent',
  singleNode: true,
  multipleNode: [],
  pageParams: { id },
})

const fuzzer: PageCache = { ...tab('fuzzer'), route: YakitRoute.HTTPFuzzer }

describe('merge AI metadata into first-level tabs', () => {
  beforeEach(() => isMemfit.mockReturnValue(false))

  it('keeps the default AI page and knowledge base first, then appends cached conversations in order', () => {
    isMemfit.mockReturnValue(true)
    const defaultAI = tab(YakitRoute.AI_Agent)
    const knowledgeBase = { ...fuzzer, route: YakitRoute.AI_REPOSITORY, routeKey: YakitRoute.AI_REPOSITORY }
    const page: PageProps = {
      routeKey: YakitRoute.AI_Agent,
      singleNode: true,
      currentSelectPageId: 'ai-a',
      pageList: [node('ai-a', 'session-a', 4), node(YakitRoute.AI_Agent, undefined, 9), node('ai-b', 'session-b', 1)],
    }
    const merged = mergeAIAgentPageTabs([knowledgeBase, defaultAI], page)
    expect(merged.map((item) => item.routeKey)).toEqual([YakitRoute.AI_Agent, YakitRoute.AI_REPOSITORY, 'ai-b', 'ai-a'])
    expect(merged[1]).toBe(knowledgeBase)

    const renamed = {
      ...page,
      pageList: page.pageList.map((item) => (item.pageId === 'ai-a' ? { ...item, pageName: 'Updated title' } : item)),
    }
    const updated = mergeAIAgentPageTabs(merged, renamed)
    expect(updated.map((item) => item.routeKey)).toEqual(merged.map((item) => item.routeKey))
    expect(updated[0]).toBe(merged[0])
    expect(updated[1]).toBe(knowledgeBase)
    expect(updated[3].verbose).toBe('Updated title')
  })

  it('keeps both fixed Memfit pages when there are no cached AI conversations', () => {
    isMemfit.mockReturnValue(true)
    const defaultAI = tab(YakitRoute.AI_Agent)
    const knowledgeBase = { ...fuzzer, route: YakitRoute.AI_REPOSITORY, routeKey: YakitRoute.AI_REPOSITORY }
    const fixedTabs = [defaultAI, knowledgeBase]
    const page: PageProps = { routeKey: YakitRoute.AI_Agent, singleNode: true, currentSelectPageId: '', pageList: [] }
    expect(mergeAIAgentPageTabs([knowledgeBase, defaultAI], page)).toEqual(fixedTabs)
  })

  it('preserves Fuzzer identity while applying AI titles and order', () => {
    const page: PageProps = {
      routeKey: YakitRoute.AI_Agent,
      singleNode: true,
      currentSelectPageId: 'ai-a',
      pageList: [node('ai-a', 'session-a', 4), { ...node('ai-b', 'session-b', 1), pageName: 'New title' }],
    }
    const merged = mergeAIAgentPageTabs([tab('ai-a'), fuzzer, tab('ai-b')], page)
    expect(merged.map((item) => item.routeKey)).toEqual(['ai-b', 'fuzzer', 'ai-a'])
    expect(merged[1]).toBe(fuzzer)
    expect(merged[0]).toMatchObject({ verbose: 'New title' })
    expect(merged[0].pageParams?.aiAgentPageInfo?.session?.SessionID).toBe('session-b')
    expect(page.pageList.map((item) => item.pageId)).toEqual(['ai-a', 'ai-b'])
  })

  it('removes only AI slots absent from pageInfo', () => {
    const existing = tab('ai-a')
    const page: PageProps = {
      routeKey: YakitRoute.AI_Agent,
      singleNode: true,
      currentSelectPageId: 'ai-a',
      pageList: [node('ai-a', 'session-a')],
    }
    const merged = mergeAIAgentPageTabs([existing, fuzzer, tab('ai-b')], page)
    expect(merged.map((item) => item.routeKey)).toEqual(['ai-a', 'fuzzer'])
    expect(merged[1]).toBe(fuzzer)
  })

  it('treats the default AI route key as an ordinary tab in Yakit', () => {
    const knowledgeBase = { ...fuzzer, route: YakitRoute.AI_REPOSITORY, routeKey: YakitRoute.AI_REPOSITORY }
    const page: PageProps = {
      routeKey: YakitRoute.AI_Agent,
      singleNode: true,
      currentSelectPageId: YakitRoute.AI_Agent,
      pageList: [node(YakitRoute.AI_Agent, 'session-a')],
    }
    const merged = mergeAIAgentPageTabs([fuzzer, knowledgeBase, tab(YakitRoute.AI_Agent)], page)
    expect(merged.map((item) => item.routeKey)).toEqual(['fuzzer', YakitRoute.AI_REPOSITORY, YakitRoute.AI_Agent])
    expect(mergeAIAgentPageTabs(merged, { ...page, pageList: [] })).toEqual([fuzzer, knowledgeBase])
  })

  it.each([false, true])('restores cached AI tabs with Memfit=%s', (memfit) => {
    isMemfit.mockReturnValue(memfit)
    const page: PageProps = {
      routeKey: YakitRoute.AI_Agent,
      singleNode: true,
      currentSelectPageId: '',
      pageList: [node('ai-new', 'session-new')],
    }
    const merged = mergeAIAgentPageTabs([fuzzer], page)
    expect(merged[0]).toBe(fuzzer)
    expect(merged[1]).toMatchObject({ routeKey: 'ai-new', menuName: 'AIAgent', verbose: 'Cached ai-new' })
  })
})

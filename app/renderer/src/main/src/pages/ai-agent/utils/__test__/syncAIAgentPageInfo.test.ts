import { beforeEach, describe, expect, it, vi } from 'vitest'
import { YakitRoute } from '@/enums/yakitRoute'
import { syncAIAgentPageInfo } from '../syncAIAgentPageInfo'
import type { AISession } from '../../type/aiChat'

const mocks = vi.hoisted(() => ({
  pages: new Map(),
  updatePagesDataCacheById: vi.fn(),
  queryPagesDataById: vi.fn(),
  emit: vi.fn(),
}))

vi.mock('@/store/pageInfo', () => ({ usePageInfo: { getState: () => mocks } }))
vi.mock('@/utils/eventBus/eventBus', () => ({ default: { emit: mocks.emit } }))

beforeEach(() => {
  vi.clearAllMocks()
  mocks.pages.clear()
  mocks.queryPagesDataById
    .mockReset()
    .mockImplementation((route, pageId) => mocks.pages.get(route)?.pageList.find((node) => node.pageId === pageId))
})

describe('syncAIAgentPageInfo', () => {
  it('按 pageId 一次绑定会话和标题，保留页面其他参数', () => {
    const info = { forgeExec: { ruleContent: '保留规则' }, defualtAIMentionCommandParams: [] }
    const node = { pageId: 'tab', pageName: 'AI Agent', pageParamsInfo: { aiAgentPageInfo: info } }
    const session = { SessionID: 'session', Title: '首问标题' } as AISession
    mocks.pages.set(YakitRoute.AI_Agent, { pageList: [node] })

    syncAIAgentPageInfo({
      pageId: 'tab',
      title: session.Title,
      aiAgentPageInfo: { session },
    })

    expect(mocks.updatePagesDataCacheById).toHaveBeenCalledExactlyOnceWith(YakitRoute.AI_Agent, {
      ...node,
      pageName: session.Title,
      pageParamsInfo: { aiAgentPageInfo: { ...info, session } },
    })
    expect(mocks.emit).toHaveBeenCalledExactlyOnceWith(
      'sessionData',
      JSON.stringify({ type: 'updateSession', sessionId: session.SessionID, updates: { Title: session.Title } }),
    )
  })

  it.each([undefined, 'AI Agent-3'])('清空会话时支持更新 Tab 名称为 %s，不发送标题信号', (title) => {
    const info = {
      session: { SessionID: 'session', Title: '历史标题' },
      forgeExec: { ruleContent: '保留规则' },
    }
    const node = { pageId: 'tab', pageName: '历史标题', pageParamsInfo: { aiAgentPageInfo: info } }
    mocks.pages.set(YakitRoute.AI_Agent, { pageList: [node] })

    syncAIAgentPageInfo({ pageId: 'tab', title, aiAgentPageInfo: { session: undefined } })

    expect(mocks.updatePagesDataCacheById).toHaveBeenCalledExactlyOnceWith(YakitRoute.AI_Agent, {
      ...node,
      pageName: title ?? node.pageName,
      pageParamsInfo: { aiAgentPageInfo: { ...info, session: undefined } },
    })
    expect(mocks.emit).not.toHaveBeenCalled()
  })

  it('标题不变时仍合并页面参数，空白标题不覆盖现有名称', () => {
    const session = { SessionID: 'session', Title: '历史标题' }
    const node = { pageId: 'tab', pageName: session.Title, pageParamsInfo: { aiAgentPageInfo: { session } } }
    mocks.pages.set(YakitRoute.AI_Agent, { pageList: [node] })

    syncAIAgentPageInfo({
      sessionId: session.SessionID,
      title: '   ',
      aiAgentPageInfo: { forgeExec: { ruleContent: '新规则' } },
    })

    expect(mocks.updatePagesDataCacheById).toHaveBeenCalledExactlyOnceWith(YakitRoute.AI_Agent, {
      ...node,
      pageParamsInfo: { aiAgentPageInfo: { session, forgeExec: { ruleContent: '新规则' } } },
    })
    expect(mocks.emit).not.toHaveBeenCalled()
  })

  it('指定的 pageId 不存在时不回退修改另一个同会话 Tab', () => {
    mocks.pages.set(YakitRoute.AI_Agent, {
      pageList: [
        {
          pageId: 'other',
          pageName: '旧标题',
          pageParamsInfo: { aiAgentPageInfo: { session: { SessionID: 'session' } } },
        },
      ],
    })

    syncAIAgentPageInfo({ pageId: 'closed', sessionId: 'session', title: '新标题' })

    expect(mocks.updatePagesDataCacheById).not.toHaveBeenCalled()
    expect(mocks.emit).not.toHaveBeenCalled()
  })

  it('Tab 标题相同时仍修复回填的旧会话标题，不重复广播', () => {
    const node = {
      pageId: 'tab',
      pageName: '实时标题',
      pageParamsInfo: {
        aiAgentPageInfo: {
          session: { SessionID: 'session', Title: '<未命名>', StartParams: { ReviewPolicy: 'manual' } },
        },
      },
    }
    mocks.pages.set(YakitRoute.AI_Agent, { pageList: [node] })

    syncAIAgentPageInfo({ sessionId: 'session', title: '实时标题' })

    expect(mocks.updatePagesDataCacheById).toHaveBeenCalledExactlyOnceWith(YakitRoute.AI_Agent, {
      ...node,
      pageParamsInfo: {
        aiAgentPageInfo: {
          session: { ...node.pageParamsInfo.aiAgentPageInfo.session, Title: '实时标题' },
        },
      },
    })
    expect(mocks.emit).not.toHaveBeenCalled()
  })
})

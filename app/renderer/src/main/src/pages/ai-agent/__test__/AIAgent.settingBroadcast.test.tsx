import '../../ai-re-act/hooks/__test__/setupElectron'
import type { ReactNode } from 'react'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getRemoteValue, setRemoteValue } from '@/utils/kv'
import emiter from '@/utils/eventBus/eventBus'
import { serializeAIAgentChatSetting } from '../utils/aiAgentChatSettingCache'
import { AIAgentSettingDefault } from '../defaultConstant'
import { AIAgent } from '../AIAgent'
import type { AISession, QueryAISessionResponse } from '../type/aiChat'
import { grpcQueryAISession } from '../grpc'
import { RemoteAIAgentGV } from '@/enums/aiAgent'
import { YakitRoute } from '@/enums/yakitRoute'
import { YakitRouteToPageInfo } from '@/routes/newRoute'
import { globalSessionEngine } from '../../ai-re-act/hooks/ChatMultiSessionController'

const ipc = vi.hoisted(() => ({
  useChatIPC: vi.fn(),
  detachPendingChat: vi.fn(),
  cancelPendingChat: vi.fn(),
  onClose: vi.fn(),
  queryPagesDataById: vi.fn(),
  updatePagesDataCacheById: vi.fn(),
  pages: new Map(),
  sessions: new Map(),
}))

vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({ t: (key: string) => key, i18nRefresh: 0 }),
}))

vi.mock('@/utils/kv', () => ({
  getRemoteValue: vi.fn(),
  setRemoteValue: vi.fn(),
}))

vi.mock('@/routes/newRoute', () => ({ YakitRouteToPageInfo: { 'ai-agent': { label: 'AIAgent' } } }))

vi.mock('../grpc', () => ({ grpcQueryAISession: vi.fn() }))

vi.mock('@/utils/notification', () => ({
  failed: vi.fn(),
}))

vi.mock('../AIAgentSideList', () => ({
  AIAgentSideList: () => null,
}))
vi.mock('@/components/yakitUI/YakitResizeBox/YakitResizeBox', () => ({
  YakitResizeBox: ({ firstNode, secondNode }: { firstNode: ReactNode; secondNode: ReactNode }) => (
    <>
      {firstNode}
      {secondNode}
    </>
  ),
}))

vi.mock('../aiBottomSideBar/AIBottomSideBar', () => ({
  AIBottomSideBar: () => null,
}))

vi.mock('../aiBottomDetails/AIBottomDetails', () => ({
  AIBottomDetails: () => null,
}))

vi.mock('../../yakRunner/SplitView/SplitView', () => ({
  SplitView: ({ elements }: { elements: { element: ReactNode }[] }) => (
    <>
      {elements.map((item, index) => (
        <div key={index}>{item.element}</div>
      ))}
    </>
  ),
}))

vi.mock('../aiAgentChat/AIAgentChat', async () => {
  const { useContext } = await import('react')
  const { default: AIAgentContext } = await import('../useContext/AIAgentContext')
  return {
    AIAgentChat: () => {
      const { store, dispatcher } = useContext(AIAgentContext)
      return (
        <div>
          <span data-testid="review-policy">{store.setting.ReviewPolicy}</span>
          <span data-testid="memory">{String(!!store.setting.DisableMemoryTriage)}</span>
          <span data-testid="goal">{store.setting.Strategy?.GoalMinIterations}</span>
          <span data-testid="enable-plan">{String(!!store.setting.EnablePlan)}</span>
          <span data-testid="setting">{JSON.stringify(store.setting)}</span>
          <span data-testid="active-title">{store.activeChat?.Title}</span>
          <span data-testid="active-session">{store.activeChat?.SessionID || 'welcome'}</span>
          <button onClick={() => dispatcher.setActiveChat({ SessionID: 'history' } as AISession)}>
            select-history
          </button>
          <button onClick={() => dispatcher.setActiveChat({ SessionID: 'created', isCreate: false } as AISession)}>
            select-created-history
          </button>
          <button onClick={() => dispatcher.setActiveChat(undefined)}>back-to-welcome</button>
          <button
            onClick={() =>
              dispatcher.setActiveChat({ SessionID: 'created', Title: '你好', isCreate: true } as AISession)
            }
          >
            create-session
          </button>
          <button type="button" onClick={() => dispatcher.setSetting((s) => ({ ...s, EnablePlan: true }))}>
            turn-on-plan
          </button>
        </div>
      )
    },
  }
})

vi.mock('../../ai-re-act/hooks/useChatIPC', () => ({
  useChatIPC: (...args: unknown[]) => {
    ipc.useChatIPC(...args)
    return {
      onStart: vi.fn(),
      onSend: vi.fn(),
      onClose: ipc.onClose,
      onUpdatePageId: vi.fn(),
      detachPendingChat: ipc.detachPendingChat,
      cancelPendingChat: ipc.cancelPendingChat,
    }
  },
}))

vi.mock('@/store/pageInfo', () => ({ usePageInfo: { getState: () => ipc } }))
vi.mock('../../ai-re-act/hooks/ChatMultiSessionController', async () => {
  const { createStore } = await import('zustand/vanilla')
  const sessionStores = createStore(() => new Map())
  return {
    globalSessionEngine: {
      sessionStores,
      updateSessionConfig: vi.fn(),
      ensureSession: (id: string) => {
        if (!ipc.sessions.has(id)) {
          ipc.sessions.set(id, {
            store: createStore(() => ({ sessionTitleUpdate: 0, execute: false })),
            rawData: { sessionTitle: '' },
          })
          sessionStores.setState(new Map(sessionStores.getState()).set(id, ipc.sessions.get(id).store), true)
        }
        return ipc.sessions.get(id)
      },
    },
  }
})

vi.mock('../../KnowledgeBase/hooks/useKnowledgeBase', () => ({
  useKnowledgeBase: () => ({ initialize: vi.fn(), knowledgeBases: [] }),
}))

vi.mock('../components/aiFileSystemList/store/useHistoryFolder', () => ({
  loadRemoteHistory: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../components/aiFileSystemList/store/useCustomFolder', () => ({
  initCustomFolderStore: vi.fn().mockResolvedValue(undefined),
}))

const getRemoteValueMock = vi.mocked(getRemoteValue)
const setRemoteValueMock = vi.mocked(setRemoteValue)
const querySessionMock = vi.mocked(grpcQueryAISession)
const sessionResponse = (Data: AISession[]): QueryAISessionResponse => ({
  Data,
  Total: Data.length,
  Pagination: { Page: 1, Limit: 20, OrderBy: 'id', Order: 'desc' },
})
const deferred = <T,>() => {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise
  })
  return { promise, resolve }
}

describe('AIAgent 配置广播', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ipc.pages.clear()
    ipc.sessions.clear()
    globalSessionEngine.sessionStores.setState(new Map(), true)
    ipc.updatePagesDataCacheById.mockReset().mockImplementation((route, node) => {
      const pageList = ipc.pages.get(route)?.pageList || []
      const otherPages = pageList.filter((item) => item.pageId !== node.pageId)
      ipc.pages.set(route, { pageList: [...otherPages, node] })
    })
    ipc.queryPagesDataById.mockReturnValue({ pageId: 'test', pageName: 'AI Agent', pageParamsInfo: {} })
    getRemoteValueMock.mockReset()
    setRemoteValueMock.mockReset()
    // 未关注初始化结果的用例保留查询中状态，避免隐式模拟会话已删除。
    querySessionMock.mockReset().mockImplementation(() => deferred<QueryAISessionResponse>().promise)
    getRemoteValueMock.mockResolvedValue(
      JSON.stringify({
        ReviewPolicy: 'yolo',
        DisableMemoryTriage: true,
        Strategy: { GoalMinIterations: 9, MaxSubAgents: 4 },
      }),
    )
    setRemoteValueMock.mockResolvedValue(undefined)
    if (typeof globalThis.ResizeObserver === 'undefined') {
      globalThis.ResizeObserver = class {
        observe() {}
        unobserve() {}
        disconnect() {}
      } as typeof ResizeObserver
    }
  })

  it('按当前 SessionID 恢复设置和标题，保留输入参数且不写入全局设置', async () => {
    const session = { SessionID: 'selected-history', Title: '旧标题', isCreate: true } as AISession
    const StartParams = {
      ReviewPolicy: 'yolo',
      EnablePlan: true,
      SyncPerceptionTrigger: true,
      SingleModelMode: true,
      DisableMemoryTriage: true,
      Strategy: { EnableGoalMode: true, EnableMultiAgent: true, GoalMinIterations: 7 },
    }
    const restored = {
      ...session,
      Title: '查询标题',
      StartParams: {
        ...StartParams,
        CoordinatorId: 'coordinator',
        Sequence: 1,
        McpServers: [],
        UserQuery: '首问',
      },
    } as AISession
    querySessionMock.mockResolvedValue(
      sessionResponse([{ SessionID: 'unrelated', Title: '无关标题' } as AISession, restored]),
    )
    const inputParams = { defualtAIMentionCommandParams: [], forgeExec: { ruleContent: 'rule' } }
    const node = {
      pageId: 'history-tab',
      pageName: session.Title,
      pageParamsInfo: { aiAgentPageInfo: { ...inputParams, session } },
    }
    ipc.queryPagesDataById.mockReturnValue(node)
    ipc.pages.set(YakitRoute.AI_Agent, { pageList: [node] })
    const broadcast = vi.fn()
    emiter.on('onAIAgentChatSettingChange', broadcast)
    try {
      render(<AIAgent pageId="history-tab" initialSession={session} />)
      await waitFor(() => expect(screen.getByTestId('goal')).toHaveTextContent('7'))
      expect(screen.getByTestId('active-title')).toHaveTextContent('旧标题')
      expect(querySessionMock.mock.calls[0][0]).toEqual(
        expect.objectContaining({
          Filter: expect.objectContaining({ SessionID: ['selected-history'] }),
        }),
      )
      expect(JSON.parse(screen.getByTestId('setting').textContent!)).toEqual({
        ...AIAgentSettingDefault,
        ...StartParams,
        Strategy: { ...AIAgentSettingDefault.Strategy, ...StartParams.Strategy },
      })
      expect(ipc.updatePagesDataCacheById).toHaveBeenCalledExactlyOnceWith(YakitRoute.AI_Agent, {
        ...node,
        pageName: restored.Title,
        pageParamsInfo: { aiAgentPageInfo: { ...inputParams, session: restored } },
      })
      expect(ipc.detachPendingChat).not.toHaveBeenCalled()
      expect(getRemoteValueMock).not.toHaveBeenCalledWith(RemoteAIAgentGV.AIAgentChatSetting)
      expect(setRemoteValueMock).not.toHaveBeenCalledWith(RemoteAIAgentGV.AIAgentChatSetting, expect.anything())
      expect(broadcast).not.toHaveBeenCalled()
      expect(globalSessionEngine.updateSessionConfig).not.toHaveBeenCalled()
      fireEvent.click(screen.getByText('turn-on-plan'))
      await waitFor(() => expect(globalSessionEngine.updateSessionConfig).toHaveBeenCalled())
      expect(setRemoteValueMock).toHaveBeenCalledWith(RemoteAIAgentGV.AIAgentChatSetting, expect.any(String))
      expect(broadcast).toHaveBeenCalled()
    } finally {
      emiter.off('onAIAgentChatSettingChange', broadcast)
    }
  })

  it('本页新建会话绑定 SessionID 后跳过查询，保留当前配置和首问标题', async () => {
    querySessionMock.mockResolvedValue(
      sessionResponse([
        { SessionID: 'created', Title: '<未命名>', StartParams: { ReviewPolicy: 'manual' } } as AISession,
      ]),
    )
    render(<AIAgent pageId="test" />)
    await waitFor(() => expect(screen.getByTestId('review-policy')).toHaveTextContent('yolo'))
    const currentSetting = screen.getByTestId('setting').textContent
    await act(async () => fireEvent.click(screen.getByText('create-session')))
    expect(querySessionMock).not.toHaveBeenCalled()
    expect(screen.getByTestId('setting').textContent).toBe(currentSetting)
    expect(screen.getByTestId('active-title')).toHaveTextContent('你好')
    expect(globalSessionEngine.updateSessionConfig).not.toHaveBeenCalled()
    expect(setRemoteValueMock).not.toHaveBeenCalled()
    expect(ipc.updatePagesDataCacheById).toHaveBeenLastCalledWith(
      YakitRoute.AI_Agent,
      expect.objectContaining({ pageName: '你好' }),
    )
  })

  it.each([
    [60, 40],
    [0, 0],
  ])('将启动参数中的字节值恢复为 %s/%s KB', async (timelineKB, tokenKB) => {
    const StartParams = { TimelineContentSizeLimit: timelineKB * 1024, AICallTokenLimit: tokenKB * 1024 }
    querySessionMock.mockResolvedValueOnce(sessionResponse([{ SessionID: 'history', StartParams } as AISession]))
    render(<AIAgent pageId="test" initialSession={{ SessionID: 'history' } as AISession} />)
    await act(async () => {})

    const setting = JSON.parse(screen.getByTestId('setting').textContent!)
    expect(setting).toMatchObject({ TimelineContentSizeLimit: timelineKB, AICallTokenLimit: tokenKB })
  })

  it.each(['user', 'broadcast'])('查询期间配置被 %s 修改后，旧响应不再恢复配置但仍更新标题', async (source) => {
    const pending = deferred<QueryAISessionResponse>()
    const session = { SessionID: 'history', Title: '旧标题' } as AISession
    const node = { pageId: 'test', pageName: session.Title, pageParamsInfo: { aiAgentPageInfo: { session } } }
    ipc.pages.set(YakitRoute.AI_Agent, { pageList: [node] })
    ipc.queryPagesDataById.mockImplementation(() => ipc.pages.get(YakitRoute.AI_Agent).pageList[0])
    querySessionMock.mockReturnValueOnce(pending.promise)
    render(<AIAgent pageId="test" initialSession={session} />)

    act(() => {
      if (source === 'user') {
        fireEvent.click(screen.getByText('turn-on-plan'))
      } else {
        emiter.emit('onAIAgentChatSettingChange', JSON.stringify({ ReviewPolicy: 'yolo' }))
      }
    })
    const currentSetting = JSON.parse(screen.getByTestId('setting').textContent!)
    expect(currentSetting).toMatchObject(source === 'user' ? { EnablePlan: true } : { ReviewPolicy: 'yolo' })
    expect(globalSessionEngine.updateSessionConfig).toHaveBeenCalledExactlyOnceWith('history', currentSetting)
    const persistedCount = setRemoteValueMock.mock.calls.length

    await act(async () =>
      pending.resolve(
        sessionResponse([
          { ...session, Title: '查询标题', StartParams: { EnablePlan: false, ReviewPolicy: 'manual' } } as AISession,
        ]),
      ),
    )

    expect(JSON.parse(screen.getByTestId('setting').textContent!)).toEqual(currentSetting)
    expect(globalSessionEngine.updateSessionConfig).toHaveBeenCalledOnce()
    expect(setRemoteValueMock).toHaveBeenCalledTimes(persistedCount)
    expect(ipc.pages.get(YakitRoute.AI_Agent).pageList[0].pageName).toBe('查询标题')
  })

  it('本页创建后切换历史、再打开已创建会话时均查询恢复', async () => {
    querySessionMock.mockResolvedValueOnce(
      sessionResponse([
        { SessionID: 'history', Title: '历史标题', StartParams: { ReviewPolicy: 'manual' } } as AISession,
      ]),
    )
    querySessionMock.mockResolvedValueOnce(
      sessionResponse([
        { SessionID: 'created', Title: '已生成标题', StartParams: { ReviewPolicy: 'yolo' } } as AISession,
      ]),
    )
    render(<AIAgent pageId="test" />)
    await waitFor(() => expect(screen.getByTestId('review-policy')).toHaveTextContent('yolo'))
    await act(async () => fireEvent.click(screen.getByText('create-session')))
    expect(querySessionMock).not.toHaveBeenCalled()

    fireEvent.click(screen.getByText('select-history'))
    await waitFor(() => expect(screen.getByTestId('review-policy')).toHaveTextContent('manual'))
    expect(querySessionMock).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ Filter: { SessionID: ['history'] } }),
    )

    fireEvent.click(screen.getByText('select-created-history'))
    await waitFor(() => expect(screen.getByTestId('review-policy')).toHaveTextContent('yolo'))
    expect(querySessionMock).toHaveBeenCalledTimes(2)
    expect(querySessionMock).toHaveBeenLastCalledWith(expect.objectContaining({ Filter: { SessionID: ['created'] } }))
    expect(ipc.updatePagesDataCacheById).toHaveBeenLastCalledWith(
      YakitRoute.AI_Agent,
      expect.objectContaining({ pageName: '已生成标题' }),
    )
  })

  it('切到本页新建会话后忽略旧会话查询响应', async () => {
    const pending = deferred<QueryAISessionResponse>()
    querySessionMock.mockReturnValueOnce(pending.promise)
    render(<AIAgent pageId="test" initialSession={{ SessionID: 'original' } as AISession} />)
    const currentSetting = screen.getByTestId('setting').textContent
    await act(async () => fireEvent.click(screen.getByText('create-session')))
    ipc.updatePagesDataCacheById.mockClear()

    await act(async () =>
      pending.resolve(
        sessionResponse([
          { SessionID: 'original', Title: '旧会话标题', StartParams: { ReviewPolicy: 'manual' } } as AISession,
        ]),
      ),
    )

    expect(querySessionMock).toHaveBeenCalledOnce()
    expect(screen.getByTestId('active-session')).toHaveTextContent('created')
    expect(screen.getByTestId('setting').textContent).toBe(currentSetting)
    expect(ipc.updatePagesDataCacheById).not.toHaveBeenCalled()
  })

  it('初始化完成后，实时标题继续更新标签和缓存标题', async () => {
    const pending = deferred<QueryAISessionResponse>()
    const session = { SessionID: 'history', Title: '<未命名>' } as AISession
    const node = { pageId: 'test', pageName: session.Title, pageParamsInfo: { aiAgentPageInfo: { session } } }
    ipc.pages.set(YakitRoute.AI_Agent, { pageList: [node] })
    ipc.queryPagesDataById.mockImplementation(() => ipc.pages.get(YakitRoute.AI_Agent).pageList[0])
    ipc.updatePagesDataCacheById.mockImplementationOnce((route, value) => {
      ipc.pages.set(route, { pageList: [value] })
    })
    querySessionMock.mockReturnValueOnce(pending.promise)
    render(<AIAgent pageId="test" initialSession={session} />)
    await act(async () => pending.resolve(sessionResponse([session])))
    ipc.updatePagesDataCacheById.mockClear()
    const data = globalSessionEngine.ensureSession('history')
    act(() => {
      data.rawData.sessionTitle = '你好'
      data.store.setState({ sessionTitleUpdate: 1 })
    })
    expect(ipc.updatePagesDataCacheById).toHaveBeenLastCalledWith(
      YakitRoute.AI_Agent,
      expect.objectContaining({
        pageName: '你好',
        pageParamsInfo: { aiAgentPageInfo: { session: { ...session, Title: '你好' } } },
      }),
    )
  })

  it('查询前已存在实时标题时，仍以查询返回的标题为准', async () => {
    const session = { SessionID: 'history', Title: '旧标题' } as AISession
    const node = { pageId: 'test', pageName: session.Title, pageParamsInfo: { aiAgentPageInfo: { session } } }
    ipc.pages.set(YakitRoute.AI_Agent, { pageList: [node] })
    ipc.queryPagesDataById.mockImplementation(() => ipc.pages.get(YakitRoute.AI_Agent).pageList[0])
    globalSessionEngine.ensureSession('history').rawData.sessionTitle = '已有实时标题'
    querySessionMock.mockResolvedValueOnce(sessionResponse([{ ...session, Title: '查询标题' }]))

    render(<AIAgent pageId="test" initialSession={session} />)
    await act(async () => {})

    const current = ipc.pages.get(YakitRoute.AI_Agent).pageList[0]
    expect(current.pageName).toBe('查询标题')
    expect(current.pageParamsInfo.aiAgentPageInfo.session.Title).toBe('查询标题')
  })

  it('初始化旧响应晚于实时标题时不覆盖新标题，仍恢复配置', async () => {
    const pending = deferred<QueryAISessionResponse>()
    const session = { SessionID: 'history', Title: '<未命名>' } as AISession
    const node = { pageId: 'test', pageName: session.Title, pageParamsInfo: { aiAgentPageInfo: { session } } }
    ipc.pages.set(YakitRoute.AI_Agent, { pageList: [node] })
    ipc.queryPagesDataById.mockImplementation(() => ipc.pages.get(YakitRoute.AI_Agent).pageList[0])
    ipc.updatePagesDataCacheById.mockImplementation((route, value) => {
      ipc.pages.set(route, { pageList: [value] })
    })
    querySessionMock.mockReturnValueOnce(pending.promise)
    const onSessionData = vi.fn()
    emiter.on('sessionData', onSessionData)
    try {
      render(<AIAgent pageId="test" initialSession={session} />)
      const data = globalSessionEngine.ensureSession('history')
      act(() => {
        data.rawData.sessionTitle = '实时标题'
        data.store.setState({ sessionTitleUpdate: 1 })
      })
      expect(onSessionData).toHaveBeenCalledWith(
        JSON.stringify({ type: 'updateSession', sessionId: 'history', updates: { Title: '实时标题' } }),
      )

      await act(async () =>
        pending.resolve(sessionResponse([{ ...session, StartParams: { ReviewPolicy: 'manual' } } as AISession])),
      )

      const current = ipc.pages.get(YakitRoute.AI_Agent).pageList[0]
      expect(current.pageName).toBe('实时标题')
      expect(current.pageParamsInfo.aiAgentPageInfo.session.Title).toBe('实时标题')
      expect(screen.getByTestId('review-policy')).toHaveTextContent('manual')
    } finally {
      emiter.off('sessionData', onSessionData)
      ipc.updatePagesDataCacheById.mockReset()
    }
  })

  it.each([undefined, { Strategy: {} }])('会话参数缺省时补齐默认设置：%j', async (StartParams) => {
    querySessionMock.mockResolvedValueOnce(sessionResponse([{ SessionID: 'history', StartParams } as AISession]))
    render(<AIAgent pageId="test" initialSession={{ SessionID: 'history' } as AISession} />)
    await act(async () => {})
    expect(JSON.parse(screen.getByTestId('setting').textContent!)).toEqual(AIAgentSettingDefault)
    expect(globalSessionEngine.updateSessionConfig).not.toHaveBeenCalled()
    expect(setRemoteValueMock).not.toHaveBeenCalled()
  })

  it.each(['empty', 'invalid', 'error'])('全局配置缓存 %s 时保留默认设置，仍可修改配置', async (result) => {
    getRemoteValueMock.mockImplementation((key) => {
      if (key !== RemoteAIAgentGV.AIAgentChatSetting) return Promise.resolve('false')
      if (result === 'error') return Promise.reject(new Error('cache unavailable'))
      return Promise.resolve(result === 'empty' ? '' : '{invalid')
    })
    render(<AIAgent pageId="test" />)
    await act(async () => {})
    expect(JSON.parse(screen.getByTestId('setting').textContent!)).toEqual(AIAgentSettingDefault)
    expect(querySessionMock).not.toHaveBeenCalled()
    expect(globalSessionEngine.updateSessionConfig).not.toHaveBeenCalled()
    expect(setRemoteValueMock).not.toHaveBeenCalled()
    fireEvent.click(screen.getByText('turn-on-plan'))
    await waitFor(() => expect(setRemoteValueMock).toHaveBeenCalled())
    expect(screen.getByTestId('enable-plan')).toHaveTextContent('true')
  })

  it('欢迎页读取全局缓存且不查询会话', async () => {
    render(<AIAgent pageId="test" />)
    await waitFor(() => expect(screen.getByTestId('review-policy')).toHaveTextContent('yolo'))
    expect(screen.getByTestId('goal')).toHaveTextContent('9')
    expect(getRemoteValueMock).toHaveBeenCalledWith(RemoteAIAgentGV.AIAgentChatSetting)
    expect(querySessionMock).not.toHaveBeenCalled()
    expect(globalSessionEngine.updateSessionConfig).not.toHaveBeenCalled()
    expect(setRemoteValueMock).not.toHaveBeenCalled()
    fireEvent.click(screen.getByText('turn-on-plan'))
    await waitFor(() => expect(setRemoteValueMock).toHaveBeenCalled())
  })

  it.each(['found', 'empty'])('切换会话后忽略旧会话查询响应：%s', async (result) => {
    const pending = deferred<QueryAISessionResponse>()
    querySessionMock.mockReturnValueOnce(pending.promise)
    querySessionMock.mockResolvedValueOnce(
      sessionResponse([
        { SessionID: 'history', Title: '当前标题', StartParams: { ReviewPolicy: 'manual' } } as AISession,
      ]),
    )
    render(<AIAgent pageId="test" initialSession={{ SessionID: 'original' } as AISession} />)
    fireEvent.click(screen.getByText('select-history'))
    await waitFor(() =>
      expect(ipc.updatePagesDataCacheById).toHaveBeenLastCalledWith(
        YakitRoute.AI_Agent,
        expect.objectContaining({ pageName: '当前标题' }),
      ),
    )
    ipc.updatePagesDataCacheById.mockClear()
    await act(async () =>
      pending.resolve(
        sessionResponse(
          result === 'empty'
            ? []
            : [{ SessionID: 'original', Title: '过期标题', StartParams: { ReviewPolicy: 'yolo' } } as AISession],
        ),
      ),
    )
    expect(screen.getByTestId('active-session')).toHaveTextContent('history')
    expect(screen.getByTestId('active-title')).toBeEmptyDOMElement()
    expect(screen.getByTestId('review-policy')).toHaveTextContent('manual')
    expect(ipc.updatePagesDataCacheById).not.toHaveBeenCalled()
  })

  it('卸载后忽略会话查询响应', async () => {
    const pending = deferred<QueryAISessionResponse>()
    querySessionMock.mockReturnValueOnce(pending.promise)
    const { unmount } = render(<AIAgent pageId="test" initialSession={{ SessionID: 'original' } as AISession} />)
    unmount()
    ipc.updatePagesDataCacheById.mockClear()
    setRemoteValueMock.mockClear()
    await act(async () =>
      pending.resolve(
        sessionResponse([
          { SessionID: 'original', Title: '卸载后标题', StartParams: { ReviewPolicy: 'yolo' } } as AISession,
        ]),
      ),
    )
    expect(ipc.updatePagesDataCacheById).not.toHaveBeenCalled()
    expect(setRemoteValueMock).not.toHaveBeenCalled()
  })

  it('绑定会话后忽略迟到的全局设置缓存', async () => {
    const pending = deferred<string>()
    getRemoteValueMock.mockImplementation((key) =>
      key === RemoteAIAgentGV.AIAgentChatSetting ? pending.promise : Promise.resolve('false'),
    )
    querySessionMock.mockResolvedValueOnce(
      sessionResponse([
        {
          SessionID: 'history',
          Title: '历史标题',
          StartParams: { ReviewPolicy: 'manual', EnablePlan: true },
        } as AISession,
      ]),
    )
    render(<AIAgent pageId="test" />)
    fireEvent.click(screen.getByText('select-history'))
    await waitFor(() => expect(screen.getByTestId('enable-plan')).toHaveTextContent('true'))
    await act(async () => pending.resolve(JSON.stringify({ ReviewPolicy: 'yolo' })))
    expect(screen.getByTestId('review-policy')).toHaveTextContent('manual')
    expect(screen.getByTestId('enable-plan')).toHaveTextContent('true')
  })

  it.each(['empty', 'unmatched'])('查询确认会话不存在（%s）时仅清空本页会话并保留其他参数', async (result) => {
    querySessionMock.mockResolvedValueOnce(
      sessionResponse(result === 'empty' ? [] : [{ SessionID: 'unrelated', Title: '无关标题' } as AISession]),
    )
    const session = { SessionID: 'deleted', Title: '已删除会话' } as AISession
    const inputParams = { defualtAIMentionCommandParams: [], forgeExec: { ruleContent: '保留规则' } }
    const node = {
      pageId: 'test',
      pageName: session.Title,
      pageParamsInfo: { aiAgentPageInfo: { ...inputParams, session } },
    }
    const otherPage = {
      pageId: 'other',
      pageName: '其他会话',
      pageParamsInfo: { aiAgentPageInfo: { session: { SessionID: 'other' } } },
    }
    ipc.pages.set(YakitRoute.AI_Agent, { pageList: [node, otherPage] })
    ipc.queryPagesDataById.mockImplementation((route, id) =>
      ipc.pages.get(route)?.pageList.find((page) => page.pageId === id),
    )

    render(<AIAgent pageId="test" initialSession={session} />)
    await waitFor(() => expect(screen.getByTestId('active-session')).toHaveTextContent('welcome'))

    expect(querySessionMock).toHaveBeenCalledOnce()
    expect(ipc.updatePagesDataCacheById).toHaveBeenCalledExactlyOnceWith(YakitRoute.AI_Agent, {
      ...node,
      pageName: `${YakitRouteToPageInfo[YakitRoute.AI_Agent].label}-2`,
      pageParamsInfo: { aiAgentPageInfo: { ...inputParams, session: undefined } },
    })
    expect(ipc.pages.get(YakitRoute.AI_Agent).pageList.find((page) => page.pageId === 'other')).toEqual(otherPage)
    expect(ipc.detachPendingChat).toHaveBeenCalledOnce()
    expect(ipc.cancelPendingChat).not.toHaveBeenCalled()
    expect(ipc.onClose).not.toHaveBeenCalled()
  })

  it('查询失败时保留已有会话标题和页面数据', async () => {
    querySessionMock.mockRejectedValueOnce(new Error('query failed'))
    const session = { SessionID: 'original', Title: '已有标题' } as AISession
    const node = { pageId: 'test', pageName: session.Title, pageParamsInfo: { aiAgentPageInfo: { session } } }
    ipc.pages.set(YakitRoute.AI_Agent, { pageList: [node] })
    ipc.queryPagesDataById.mockReturnValue(node)
    render(<AIAgent pageId="test" initialSession={session} />)
    await act(async () => {})
    expect(querySessionMock).toHaveBeenCalledOnce()
    expect(screen.getByTestId('active-title')).toHaveTextContent('已有标题')
    expect(screen.getByTestId('active-session')).toHaveTextContent('original')
    expect(screen.getByTestId('review-policy')).toHaveTextContent(AIAgentSettingDefault.ReviewPolicy!)
    expect(ipc.updatePagesDataCacheById).not.toHaveBeenCalled()
    expect(ipc.pages.get(YakitRoute.AI_Agent).pageList).toEqual([node])
    expect(ipc.detachPendingChat).not.toHaveBeenCalled()
  })

  it('新 Tab 保留传入的历史会话和独立 pageId', async () => {
    render(<AIAgent pageId="history-tab" initialSession={{ SessionID: 'selected-history' } as AISession} />)
    await waitFor(() => expect(screen.getByTestId('active-session')).toHaveTextContent('selected-history'))
    expect(ipc.useChatIPC).toHaveBeenCalledWith(YakitRoute.AI_Agent, 'history-tab', true)
    expect(ipc.detachPendingChat).not.toHaveBeenCalled()
    expect(ipc.updatePagesDataCacheById).not.toHaveBeenCalled()
  })

  it('默认页挂载后保持欢迎页，不补同步随后传入的初始会话', async () => {
    const { rerender } = render(<AIAgent pageId="test" />)
    await waitFor(() => expect(screen.getByTestId('review-policy')).toHaveTextContent('yolo'))
    expect(screen.getByTestId('active-session')).toHaveTextContent('welcome')

    rerender(<AIAgent pageId="test" initialSession={{ SessionID: 'restored' } as AISession} />)

    expect(screen.getByTestId('active-session')).toHaveTextContent('welcome')
    expect(ipc.detachPendingChat).not.toHaveBeenCalled()
    expect(ipc.updatePagesDataCacheById).not.toHaveBeenCalled()
  })

  it('回到欢迎页后，同一初始会话的重渲染和标题更新不会重新打开会话', async () => {
    const session = { SessionID: 'restored', Title: '原名称' } as AISession
    const { rerender } = render(<AIAgent pageId="test" initialSession={session} />)
    await waitFor(() => expect(querySessionMock).toHaveBeenCalledOnce())
    await act(async () => {
      fireEvent.click(screen.getByText('back-to-welcome'))
    })
    ipc.detachPendingChat.mockClear()
    ipc.updatePagesDataCacheById.mockClear()

    rerender(<AIAgent pageId="test" initialSession={session} />)
    rerender(<AIAgent pageId="test" initialSession={{ ...session, Title: '新名称' }} />)

    expect(screen.getByTestId('active-session')).toHaveTextContent('welcome')
    expect(ipc.detachPendingChat).not.toHaveBeenCalled()
    expect(ipc.updatePagesDataCacheById).not.toHaveBeenCalled()
  })

  it('重新打开的初始会话即使残留 isCreate 标记，也查询恢复', async () => {
    render(<AIAgent pageId="test" initialSession={{ SessionID: 'created', isCreate: true } as AISession} />)
    expect(screen.getByTestId('active-session')).toHaveTextContent('created')
    await waitFor(() => expect(querySessionMock).toHaveBeenCalledOnce())
    expect(ipc.detachPendingChat).not.toHaveBeenCalled()
    expect(ipc.updatePagesDataCacheById).not.toHaveBeenCalled()
  })

  it('已在当前页面选中会话时，迟到的初始缓存不会覆盖当前会话', async () => {
    const { rerender } = render(<AIAgent pageId="test" />)
    await waitFor(() => expect(screen.getByTestId('review-policy')).toHaveTextContent('yolo'))
    fireEvent.click(screen.getByText('select-history'))
    ipc.detachPendingChat.mockClear()
    ipc.updatePagesDataCacheById.mockClear()

    rerender(<AIAgent pageId="test" initialSession={{ SessionID: 'restored' } as AISession} />)

    expect(screen.getByTestId('active-session')).toHaveTextContent('history')
    expect(ipc.detachPendingChat).not.toHaveBeenCalled()
    expect(ipc.updatePagesDataCacheById).not.toHaveBeenCalled()
  })

  it.each([
    ['旧标题', 1],
    ['新标题', 0],
    [undefined, 0],
  ] as const)('sessionTitleUpdate 在标签为 %s 时发送 %s 次历史标题更新', async (pageName, expectedUpdates) => {
    const session = { SessionID: 'history', Title: '旧标题' } as AISession
    if (pageName !== undefined) {
      ipc.pages.set(YakitRoute.AI_Agent, {
        pageList: [{ pageId: 'test', pageName, pageParamsInfo: { aiAgentPageInfo: { session } } }],
      })
    }
    const onSessionData = vi.fn()
    emiter.on('sessionData', onSessionData)
    try {
      const { unmount } = render(<AIAgent pageId="test" initialSession={session} />)
      await act(async () => {})
      const data = globalSessionEngine.ensureSession(session.SessionID)
      data.rawData.sessionTitle = '新标题'
      act(() => data.store.setState({ execute: true }))
      expect(onSessionData).not.toHaveBeenCalled()

      act(() => data.store.setState({ sessionTitleUpdate: 1 }))
      expect(onSessionData).toHaveBeenCalledTimes(expectedUpdates)
      if (expectedUpdates) {
        expect(onSessionData).toHaveBeenCalledWith(
          JSON.stringify({ type: 'updateSession', sessionId: 'history', updates: { Title: '新标题' } }),
        )
      }
      data.rawData.sessionTitle = '   '
      act(() => data.store.setState({ sessionTitleUpdate: 2 }))
      expect(onSessionData).toHaveBeenCalledTimes(expectedUpdates)
      unmount()
      data.rawData.sessionTitle = '卸载后标题'
      act(() => data.store.setState({ sessionTitleUpdate: 3 }))
      expect(onSessionData).toHaveBeenCalledTimes(expectedUpdates)
    } finally {
      emiter.off('sessionData', onSessionData)
    }
  })

  it('仅在 sessionTitleUpdate 变化时按 SessionID 更新标签名称和缓存标题', async () => {
    const session = { SessionID: 'selected-history', Title: '原名称' } as AISession
    const inputParams = { defualtAIMentionCommandParams: [], forgeExec: { ruleContent: 'rule' } }
    const node = {
      pageId: 'history-tab',
      pageName: session.Title,
      pageParamsInfo: { aiAgentPageInfo: { ...inputParams, session } },
    }
    ipc.pages.set(YakitRoute.AI_Agent, {
      pageList: [
        { ...node, pageId: 'other-tab', pageParamsInfo: { aiAgentPageInfo: { session: { SessionID: 'other' } } } },
        node,
      ],
    })
    render(<AIAgent pageId="history-tab" initialSession={session} />)
    await waitFor(() => expect(querySessionMock).toHaveBeenCalledOnce())
    const data = globalSessionEngine.ensureSession(session.SessionID)
    data.rawData.sessionTitle = '新名称'

    act(() => data.store.setState({ execute: true }))
    expect(ipc.updatePagesDataCacheById).not.toHaveBeenCalled()

    act(() => data.store.setState({ sessionTitleUpdate: 1 }))
    expect(ipc.updatePagesDataCacheById).toHaveBeenCalledExactlyOnceWith(YakitRoute.AI_Agent, {
      ...node,
      pageName: '新名称',
      pageParamsInfo: { aiAgentPageInfo: { ...inputParams, session: { ...session, Title: '新名称' } } },
    })

    data.rawData.sessionTitle = '   '
    act(() => data.store.setState({ sessionTitleUpdate: 2 }))
    expect(ipc.updatePagesDataCacheById).toHaveBeenCalledTimes(1)
  })

  it('绑定会话后同步回放的标题在订阅建立时写入标签缓存', async () => {
    const node = { pageId: 'test', pageName: 'AI Agent', pageParamsInfo: {} }
    ipc.queryPagesDataById.mockReturnValue(node)
    ipc.updatePagesDataCacheById.mockImplementationOnce((route, boundNode) => {
      ipc.pages.set(route, { pageList: [boundNode] })
    })
    render(<AIAgent pageId="test" />)
    await waitFor(() => expect(screen.getByTestId('review-policy')).toHaveTextContent('yolo'))
    const data = globalSessionEngine.ensureSession('history')
    ipc.detachPendingChat.mockImplementationOnce(() => {
      data.rawData.sessionTitle = '首个回放标题'
      data.store.setState({ sessionTitleUpdate: 1 })
    })

    fireEvent.click(screen.getByText('select-history'))

    expect(ipc.updatePagesDataCacheById).toHaveBeenCalledTimes(2)
    expect(ipc.updatePagesDataCacheById).toHaveBeenLastCalledWith(YakitRoute.AI_Agent, {
      ...node,
      pageName: '首个回放标题',
      pageParamsInfo: { aiAgentPageInfo: { session: { SessionID: 'history', Title: '首个回放标题' } } },
    })
  })

  it('挂载时同步已有标题，后续普通渲染和无关事件保留手动标题', async () => {
    const session = { SessionID: 'history', Title: '原名称' } as AISession
    const node = {
      pageId: 'history-tab',
      pageName: session.Title,
      pageParamsInfo: { aiAgentPageInfo: { session } },
    }
    ipc.pages.set(YakitRoute.AI_Agent, { pageList: [node] })
    const data = globalSessionEngine.ensureSession(session.SessionID)
    data.rawData.sessionTitle = '已有标题'
    data.store.setState({ sessionTitleUpdate: 1 })

    const { rerender } = render(<AIAgent pageId="history-tab" initialSession={session} />)
    await waitFor(() => expect(querySessionMock).toHaveBeenCalledOnce())
    expect(ipc.updatePagesDataCacheById).toHaveBeenCalledExactlyOnceWith(
      YakitRoute.AI_Agent,
      expect.objectContaining({ pageName: '已有标题' }),
    )

    node.pageName = '手动标题'
    rerender(<AIAgent pageId="history-tab" initialSession={{ ...session, Title: '手动标题' }} />)
    act(() => data.store.setState({ execute: true }))
    expect(ipc.updatePagesDataCacheById).toHaveBeenCalledTimes(1)
  })

  it('关页收尾后重建同一会话 store 时重新订阅标题，并释放旧订阅', async () => {
    const session = { SessionID: 'history', Title: '原名称' } as AISession
    const node = {
      pageId: 'history-tab',
      pageName: session.Title,
      pageParamsInfo: { aiAgentPageInfo: { session } },
    }
    ipc.pages.set(YakitRoute.AI_Agent, { pageList: [node] })
    const oldData = globalSessionEngine.ensureSession(session.SessionID)
    const { unmount } = render(<AIAgent pageId="history-tab" initialSession={session} />)
    await waitFor(() => expect(querySessionMock).toHaveBeenCalledOnce())
    ipc.updatePagesDataCacheById.mockClear()

    // 模拟后台收尾卸池；相同 SessionID 的页面仍挂载，不能重新创建占位 store。
    act(() => {
      ipc.sessions.delete(session.SessionID)
      globalSessionEngine.sessionStores.setState(new Map(), true)
      oldData.rawData.sessionTitle = '已销毁会话的标题'
      oldData.store.setState({ sessionTitleUpdate: 1 })
    })
    expect(ipc.sessions.has(session.SessionID)).toBe(false)
    expect(ipc.updatePagesDataCacheById).not.toHaveBeenCalled()

    // 重新注册前已有回放标题，注册后再到达一个实时标题。
    const { createStore } = await import('zustand/vanilla')
    const newData = {
      store: createStore(() => ({ sessionTitleUpdate: 1, execute: false })) as typeof oldData.store,
      rawData: { sessionTitle: '重连回放标题' },
    }
    act(() => {
      ipc.sessions.set(session.SessionID, newData)
      globalSessionEngine.sessionStores.setState(new Map([[session.SessionID, newData.store]]), true)
    })
    expect(ipc.pages.get(YakitRoute.AI_Agent).pageList[0].pageName).toBe('重连回放标题')
    act(() => {
      newData.rawData.sessionTitle = '重连实时标题'
      newData.store.setState({ sessionTitleUpdate: 2 })
    })
    const updated = ipc.pages.get(YakitRoute.AI_Agent).pageList[0]
    expect(updated.pageName).toBe('重连实时标题')
    expect(updated.pageParamsInfo.aiAgentPageInfo.session.Title).toBe('重连实时标题')
    ipc.updatePagesDataCacheById.mockClear()

    act(() => {
      oldData.rawData.sessionTitle = '迟到的旧标题'
      oldData.store.setState({ sessionTitleUpdate: 2 })
      globalSessionEngine.ensureSession('unrelated')
    })
    expect(ipc.updatePagesDataCacheById).not.toHaveBeenCalled()

    unmount()
    act(() => {
      newData.rawData.sessionTitle = '卸载后标题'
      newData.store.setState({ sessionTitleUpdate: 3 })
      globalSessionEngine.sessionStores.setState(new Map([[session.SessionID, oldData.store]]), true)
    })
    expect(ipc.updatePagesDataCacheById).not.toHaveBeenCalled()
  })

  it('切换会话和卸载时取消旧标题订阅', async () => {
    const sessions = ['original', 'history'].map((SessionID) => ({ SessionID, Title: SessionID }) as AISession)
    ipc.pages.set(YakitRoute.AI_Agent, {
      pageList: sessions.map((session) => ({
        pageId: session.SessionID,
        pageName: session.Title,
        pageParamsInfo: { aiAgentPageInfo: { session } },
      })),
    })
    const { unmount } = render(<AIAgent pageId="test" initialSession={sessions[0]} />)
    await waitFor(() => expect(querySessionMock).toHaveBeenCalledOnce())
    const original = globalSessionEngine.ensureSession('original')
    fireEvent.click(screen.getByText('select-history'))
    const history = globalSessionEngine.ensureSession('history')
    ipc.updatePagesDataCacheById.mockClear()

    original.rawData.sessionTitle = '旧会话更新'
    act(() => original.store.setState({ sessionTitleUpdate: 1 }))
    expect(ipc.updatePagesDataCacheById).not.toHaveBeenCalled()

    history.rawData.sessionTitle = '当前会话更新'
    act(() => history.store.setState({ sessionTitleUpdate: 1 }))
    expect(ipc.updatePagesDataCacheById).toHaveBeenCalledExactlyOnceWith(
      YakitRoute.AI_Agent,
      expect.objectContaining({ pageId: 'history', pageName: '当前会话更新' }),
    )

    unmount()
    ipc.updatePagesDataCacheById.mockClear()
    history.rawData.sessionTitle = '卸载后更新'
    act(() => history.store.setState({ sessionTitleUpdate: 2 }))
    expect(ipc.updatePagesDataCacheById).not.toHaveBeenCalled()
  })

  it('相同 SessionID 跳过标签缓存更新，仍更新当前会话并脱离 pending 视图', async () => {
    ipc.queryPagesDataById.mockReturnValue({
      pageId: 'test',
      pageName: '已更新的标题',
      pageParamsInfo: { aiAgentPageInfo: { session: { SessionID: 'history', Title: '已更新的标题' } } },
    })
    render(<AIAgent pageId="test" initialSession={{ SessionID: 'original' } as AISession} />)
    await waitFor(() => expect(querySessionMock).toHaveBeenCalledOnce())

    fireEvent.click(screen.getByText('select-history'))

    expect(ipc.updatePagesDataCacheById).not.toHaveBeenCalled()
    expect(screen.getByTestId('active-session')).toHaveTextContent('history')
    expect(ipc.detachPendingChat).toHaveBeenCalledOnce()
  })

  it('切历史和欢迎页只脱离 pending 视图，提交继续在后台运行', async () => {
    const inputParams = { defualtAIMentionCommandParams: [], forgeExec: { ruleContent: 'rule' } }
    ipc.queryPagesDataById.mockReturnValue({ pageId: 'test', pageParamsInfo: { aiAgentPageInfo: inputParams } })
    render(<AIAgent pageId="test" />)
    await waitFor(() => expect(screen.getByTestId('review-policy')).toHaveTextContent('yolo'))
    expect(ipc.useChatIPC).toHaveBeenCalledWith(YakitRoute.AI_Agent, 'test', true)
    fireEvent.click(screen.getByText('select-history'))
    expect(screen.getByTestId('active-session')).toHaveTextContent('history')
    expect(ipc.detachPendingChat).toHaveBeenCalledTimes(1)
    expect(ipc.queryPagesDataById).toHaveBeenCalledWith(YakitRoute.AI_Agent, 'test')
    expect(ipc.updatePagesDataCacheById).toHaveBeenLastCalledWith(
      YakitRoute.AI_Agent,
      expect.objectContaining({
        pageId: 'test',
        pageParamsInfo: { aiAgentPageInfo: { ...inputParams, session: { SessionID: 'history' } } },
      }),
    )
    await act(async () => {
      fireEvent.click(screen.getByText('back-to-welcome'))
    })
    expect(screen.getByTestId('active-session')).toHaveTextContent('welcome')
    expect(ipc.detachPendingChat).toHaveBeenCalledTimes(2)
    expect(ipc.updatePagesDataCacheById).toHaveBeenLastCalledWith(
      YakitRoute.AI_Agent,
      expect.objectContaining({ pageParamsInfo: { aiAgentPageInfo: { ...inputParams, session: undefined } } }),
    )
    expect(ipc.cancelPendingChat).not.toHaveBeenCalled()
    expect(ipc.onClose).not.toHaveBeenCalled()
  })

  it.each([1, 3])('回到欢迎页时按当前 %s 个 AI Tab 重命名，只清空本页会话', async (tabCount) => {
    const session = { SessionID: 'history', Title: '会话标题' } as AISession
    const info = { session, forgeExec: { ruleContent: '保留规则' } }
    const node = { pageId: 'test', pageName: session.Title, pageParamsInfo: { aiAgentPageInfo: info } }
    const otherPages = Array.from({ length: tabCount - 1 }, (_, index) => ({
      pageId: `other-${index}`,
      pageName: `其他会话-${index}`,
      pageParamsInfo: { aiAgentPageInfo: { session: { SessionID: `other-${index}` } } },
    }))
    ipc.pages.set(YakitRoute.AI_Agent, { pageList: [node, ...otherPages] })
    ipc.queryPagesDataById.mockImplementation((route, id) =>
      ipc.pages.get(route)?.pageList.find((page) => page.pageId === id),
    )
    render(<AIAgent pageId="test" initialSession={session} />)
    await act(async () => {})
    const onSessionData = vi.fn()
    emiter.on('sessionData', onSessionData)
    try {
      await act(async () => fireEvent.click(screen.getByText('back-to-welcome')))

      expect(ipc.updatePagesDataCacheById).toHaveBeenCalledExactlyOnceWith(YakitRoute.AI_Agent, {
        ...node,
        pageName: `${YakitRouteToPageInfo[YakitRoute.AI_Agent].label}-${tabCount}`,
        pageParamsInfo: { aiAgentPageInfo: { ...info, session: undefined } },
      })
      expect(screen.getByTestId('active-session')).toHaveTextContent('welcome')
      expect(ipc.pages.get(YakitRoute.AI_Agent).pageList.filter((page) => page.pageId !== 'test')).toEqual(otherPages)
      expect(onSessionData).not.toHaveBeenCalled()
    } finally {
      emiter.off('sessionData', onSessionData)
    }
  })

  it('加载缓存后收到设置广播，会合并已保存项并保留当前会话开关，再写回缓存', async () => {
    render(<AIAgent pageId="test" />)

    await waitFor(() => {
      expect(screen.getByTestId('review-policy')).toHaveTextContent('yolo')
    })
    expect(screen.getByTestId('memory')).toHaveTextContent('true')
    expect(screen.getByTestId('goal')).toHaveTextContent('9')
    expect(screen.getByTestId('enable-plan')).toHaveTextContent('false')

    fireEvent.click(screen.getByText('turn-on-plan'))
    await waitFor(() => {
      expect(screen.getByTestId('enable-plan')).toHaveTextContent('true')
    })

    act(() => {
      emiter.emit(
        'onAIAgentChatSettingChange',
        serializeAIAgentChatSetting({
          ...AIAgentSettingDefault,
          ReviewPolicy: 'manual',
          DisableMemoryTriage: true,
          Strategy: { GoalMinIterations: 9, MaxSubAgents: 4 },
        }),
      )
    })

    await waitFor(() => {
      expect(screen.getByTestId('review-policy')).toHaveTextContent('manual')
    })
    expect(screen.getByTestId('enable-plan')).toHaveTextContent('true')
    expect(screen.getByTestId('memory')).toHaveTextContent('true')
    expect(screen.getByTestId('goal')).toHaveTextContent('9')

    await waitFor(() => {
      const last = setRemoteValueMock.mock.calls.at(-1)
      expect(last?.[1]).toContain('"ReviewPolicy":"manual"')
      expect(last?.[1]).toContain('"DisableMemoryTriage":true')
      expect(last?.[1]).toContain('"GoalMinIterations":9')
      expect(last?.[1]).not.toContain('EnablePlan')
    })
  })
})

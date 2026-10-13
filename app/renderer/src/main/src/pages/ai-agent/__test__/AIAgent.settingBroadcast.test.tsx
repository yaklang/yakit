import '../../ai-re-act/hooks/__test__/setupElectron'
import type { ReactNode } from 'react'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getRemoteValue, setRemoteValue } from '@/utils/kv'
import emiter from '@/utils/eventBus/eventBus'
import { serializeAIAgentChatSetting } from '../utils/aiAgentChatSettingCache'
import { AIAgentSettingDefault } from '../defaultConstant'
import { AIAgent } from '../AIAgent'
import type { AISession } from '../type/aiChat'
import { YakitRoute } from '@/enums/yakitRoute'
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
          <span data-testid="active-session">{store.activeChat?.SessionID || 'welcome'}</span>
          <button onClick={() => dispatcher.setActiveChat({ SessionID: 'history' } as AISession)}>
            select-history
          </button>
          <button onClick={() => dispatcher.setActiveChat(undefined)}>back-to-welcome</button>
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
  return {
    globalSessionEngine: {
      updateSessionConfig: vi.fn(),
      ensureSession: (id: string) => {
        if (!ipc.sessions.has(id)) {
          ipc.sessions.set(id, {
            store: createStore(() => ({ sessionTitleUpdate: 0, execute: false })),
            rawData: { sessionTitle: '' },
          })
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

describe('AIAgent 配置广播', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ipc.pages.clear()
    ipc.sessions.clear()
    ipc.queryPagesDataById.mockReturnValue({ pageId: 'test', pageName: 'AI Agent', pageParamsInfo: {} })
    getRemoteValueMock.mockReset()
    setRemoteValueMock.mockReset()
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
    await waitFor(() => expect(screen.getByTestId('review-policy')).toHaveTextContent('yolo'))
    fireEvent.click(screen.getByText('back-to-welcome'))
    ipc.detachPendingChat.mockClear()
    ipc.updatePagesDataCacheById.mockClear()

    rerender(<AIAgent pageId="test" initialSession={session} />)
    rerender(<AIAgent pageId="test" initialSession={{ ...session, Title: '新名称' }} />)

    expect(screen.getByTestId('active-session')).toHaveTextContent('welcome')
    expect(ipc.detachPendingChat).not.toHaveBeenCalled()
    expect(ipc.updatePagesDataCacheById).not.toHaveBeenCalled()
  })

  it('新建会话直接使用初始数据，不等待恢复查询', async () => {
    render(<AIAgent pageId="test" initialSession={{ SessionID: 'created', isCreate: true } as AISession} />)
    expect(screen.getByTestId('active-session')).toHaveTextContent('created')
    await waitFor(() => expect(screen.getByTestId('review-policy')).toHaveTextContent('yolo'))
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
    await waitFor(() => expect(screen.getByTestId('review-policy')).toHaveTextContent('yolo'))
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
    await waitFor(() => expect(screen.getByTestId('review-policy')).toHaveTextContent('yolo'))
    expect(ipc.updatePagesDataCacheById).toHaveBeenCalledExactlyOnceWith(
      YakitRoute.AI_Agent,
      expect.objectContaining({ pageName: '已有标题' }),
    )

    node.pageName = '手动标题'
    rerender(<AIAgent pageId="history-tab" initialSession={{ ...session, Title: '手动标题' }} />)
    act(() => data.store.setState({ execute: true }))
    expect(ipc.updatePagesDataCacheById).toHaveBeenCalledTimes(1)
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
    await waitFor(() => expect(screen.getByTestId('review-policy')).toHaveTextContent('yolo'))
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
    await waitFor(() => expect(screen.getByTestId('review-policy')).toHaveTextContent('yolo'))

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
    fireEvent.click(screen.getByText('back-to-welcome'))
    expect(screen.getByTestId('active-session')).toHaveTextContent('welcome')
    expect(ipc.detachPendingChat).toHaveBeenCalledTimes(2)
    expect(ipc.updatePagesDataCacheById).toHaveBeenLastCalledWith(
      YakitRoute.AI_Agent,
      expect.objectContaining({ pageParamsInfo: { aiAgentPageInfo: { ...inputParams, session: undefined } } }),
    )
    expect(ipc.cancelPendingChat).not.toHaveBeenCalled()
    expect(ipc.onClose).not.toHaveBeenCalled()
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

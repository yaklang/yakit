import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import HistoryChat from '../HistoryChat'
import emiter from '@/utils/eventBus/eventBus'
import { ReActChatEventEnum } from '../../defaultConstant'
import type { AISession } from '../../type/aiChat'
import type { AISource } from '@/pages/ai-re-act/hooks/grpcApi'
import { YakitRoute } from '@/enums/yakitRoute'

const mocks = vi.hoisted(() => ({
  dispatcher: {
    setSessions: vi.fn(),
    resetPagination: vi.fn(),
    loadHistoryData: vi.fn().mockResolvedValue(0),
    getSessions: vi.fn(),
  },
  setActiveChat: vi.fn(),
  pages: new Map(),
  updatePagesDataCacheById: vi.fn(),
  ctx: {
    activeChat: undefined as { SessionID: string } | undefined,
    sessions: [] as { SessionID: string; UpdatedAt: number }[],
  },
  viewport: { visible: true },
}))

vi.mock('ahooks', async () => ({ ...(await vi.importActual('ahooks')), useInViewport: () => [mocks.viewport.visible] }))
vi.mock('../../useContext/useStore', () => ({ default: () => ({ activeChat: mocks.ctx.activeChat }) }))
vi.mock('../../useContext/useDispatcher', () => ({
  default: () => ({ getSetting: () => ({ Source: 'ai' }), setActiveChat: mocks.setActiveChat }),
}))
vi.mock('@/i18n/useI18nNamespaces', () => ({ useI18nNamespaces: () => ({ t: (key: string) => key }) }))
vi.mock('../HistoryChatList/hook/useSessionList', () => ({
  default: () => [{ sessions: mocks.ctx.sessions }, mocks.dispatcher],
}))
vi.mock('../HistoryChatList/HistoryChatList', () => ({
  default: () => <div>历史会话内容</div>,
  DAY_MS: 86400000,
  getChatTimestamp: (session: { UpdatedAt?: number }) => session.UpdatedAt ?? 0,
}))
vi.mock('../../aiChatWelcome/AIChatWelcomeSideSetting', () => ({
  SideSettingButton: () => <button>固定</button>,
}))
vi.mock('../../grpc', () => ({ grpcDeleteAISession: vi.fn() }))
vi.mock('../utils', async () => ({
  ...(await import('../deleteSource')),
  AISessionDeleteCancelledError: class extends Error {},
  handAIHistoryChatRemove: vi.fn(),
}))
vi.mock('@/pages/ai-re-act/hooks/useGetChatDataStoreKey', () => ({
  default: () => 'ai',
  getImageStoreKeyByAISource: () => 'ai',
}))
vi.mock('@/store/pageInfo', () => ({
  usePageInfo: Object.assign(() => 'ai-agent', { getState: () => mocks }),
}))
vi.mock('@/pages/ai-re-act/hooks/ChatMultiSessionController', () => ({
  globalSessionEngine: { getSessionIdsBySourceAndRoute: () => [] },
}))

beforeEach(() => {
  vi.clearAllMocks()
  mocks.dispatcher.setSessions.mockReset()
  mocks.setActiveChat.mockReset()
  mocks.ctx.activeChat = undefined
  mocks.ctx.sessions = []
  mocks.viewport.visible = true
  mocks.pages.clear()
  mocks.dispatcher.getSessions.mockReturnValue([])
})

describe('HistoryChat 会话参数增量更新', () => {
  const original = {
    SessionID: 'current',
    Title: 'original',
    StartParams: {
      RuntimeContextSizeLimit: 307200,
      SyncPerceptionTrigger: true,
      EnablePlan: true,
      Strategy: { EnableGoalMode: true, MaxSubAgents: 4 },
    },
  } as AISession

  const applyEvents = (updates: Partial<AISession>[], current: AISession | undefined = original) => {
    const other = { SessionID: 'other', StartParams: { EnablePlan: true } } as AISession
    let sessions = [original, other]
    let active = current
    mocks.ctx.activeChat = current
    mocks.dispatcher.setSessions.mockImplementation((update) => {
      sessions = typeof update === 'function' ? update(sessions) : update
    })
    mocks.setActiveChat.mockImplementation((update) => {
      active = typeof update === 'function' ? update(active) : update
    })
    render(<HistoryChat aiSource={['ai']} />)
    act(() => {
      updates.forEach((patch) =>
        emiter.emit('sessionData', JSON.stringify({ type: 'updateSession', sessionId: 'current', updates: patch })),
      )
    })
    return { sessions, active, other }
  }

  it.each([false, true])('连续更新上下文和同步开关保留全部参数，反向顺序：%s', (reverse) => {
    const updates = [
      { StartParams: { RuntimeContextSizeLimit: 614400 } },
      { StartParams: { SyncPerceptionTrigger: false } },
    ]
    const { sessions, active, other } = applyEvents(reverse ? updates.reverse() : updates)
    const expected = {
      ...original,
      StartParams: { ...original.StartParams, RuntimeContextSizeLimit: 614400, SyncPerceptionTrigger: false },
    }
    expect(sessions[0]).toEqual(expected)
    expect(active).toEqual(expected)
    expect(sessions[1]).toBe(other)
    expect(original.StartParams?.RuntimeContextSizeLimit).toBe(307200)
    expect(original.StartParams?.SyncPerceptionTrigger).toBe(true)
    expect(sessions[0]).not.toBe(original)
    expect(sessions[0].StartParams).not.toBe(original.StartParams)
  })

  it('策略字段逐项合并，false 和 0 生效且保留普通属性更新', () => {
    const { sessions, active } = applyEvents([
      { StartParams: { Strategy: { EnableGoalMode: false } } },
      { StartParams: { Strategy: { MaxSubAgents: 0 }, EnablePlan: false } },
      { Title: 'renamed' },
    ])
    expect(sessions[0]).toEqual({
      ...original,
      Title: 'renamed',
      StartParams: {
        ...original.StartParams,
        EnablePlan: false,
        Strategy: { EnableGoalMode: false, MaxSubAgents: 0 },
      },
    })
    expect(active).toEqual(sessions[0])
    expect(original.StartParams?.Strategy).toEqual({ EnableGoalMode: true, MaxSubAgents: 4 })
  })

  it('目标会话更新不改变另一个当前会话', () => {
    const current = { SessionID: 'another', StartParams: { RuntimeContextSizeLimit: 102400 } } as AISession
    const { sessions, active } = applyEvents([{ StartParams: { RuntimeContextSizeLimit: 0 } }], current)
    expect(sessions[0].StartParams).toEqual({ ...original.StartParams, RuntimeContextSizeLimit: 0 })
    expect(active).toBe(current)
    expect(mocks.setActiveChat).not.toHaveBeenCalled()
  })
})

describe('HistoryChat 头部操作', () => {
  it.each([{ selectSessionId: 'target' }, { selectFirst: true }])(
    '刷新后选中会话时同步对应 Tab 标题：%j',
    async (selection) => {
      const session = { SessionID: 'target', Title: '刷新后的标题', Source: 'ai' } as AISession
      const node = {
        pageId: 'target-tab',
        pageName: '<未命名>',
        pageParamsInfo: { aiAgentPageInfo: { session: { ...session, Title: '<未命名>' }, query: '保留输入' } },
      }
      const other = {
        ...node,
        pageId: 'other-tab',
        pageParamsInfo: { aiAgentPageInfo: { session: { ...session, SessionID: 'other' } } },
      }
      mocks.pages.set(YakitRoute.AI_Agent, { pageList: [other, node] })
      mocks.dispatcher.getSessions.mockReturnValue([session])
      render(<HistoryChat aiSource={['ai']} />)

      await act(async () => emiter.emit('sessionData', JSON.stringify({ type: 'refresh', ...selection })))

      expect(mocks.setActiveChat).toHaveBeenCalledExactlyOnceWith(session)
      expect(mocks.updatePagesDataCacheById).toHaveBeenCalledExactlyOnceWith(YakitRoute.AI_Agent, {
        ...node,
        pageName: session.Title,
        pageParamsInfo: { aiAgentPageInfo: { ...node.pageParamsInfo.aiAgentPageInfo, session } },
      })
      expect(mocks.setActiveChat.mock.invocationCallOrder[0]).toBeLessThan(
        mocks.updatePagesDataCacheById.mock.invocationCallOrder[0],
      )
      // 刷新分支只写 Tab 缓存，不广播 updateSession 触发列表更新。
      expect(mocks.dispatcher.setSessions).not.toHaveBeenCalledWith(expect.any(Function))
    },
  )

  it('标题广播同步所有列表实例，仅更新对应 SessionID', () => {
    render(
      <>
        <HistoryChat aiSource={['ai']} />
        <HistoryChat aiSource={['ai']} />
      </>,
    )
    mocks.dispatcher.setSessions.mockClear()
    const previous = [
      { SessionID: 'target', Title: '同名会话', Source: 'ai' },
      { SessionID: 'other', Title: '同名会话', Source: 'ai' },
    ] as AISession[]
    act(() =>
      emiter.emit(
        'sessionData',
        JSON.stringify({
          type: 'updateSession',
          sessionId: 'target',
          updates: { Title: '新标题' },
        }),
      ),
    )
    expect(mocks.dispatcher.setSessions).toHaveBeenCalledTimes(2)
    for (const [update] of mocks.dispatcher.setSessions.mock.calls) {
      expect(update(previous)).toEqual([{ ...previous[0], Title: '新标题' }, previous[1]])
    }
  })

  it('重复绑定同一 session 时更新并置顶，而同名的其他会话继续保留', () => {
    const { unmount } = render(<HistoryChat aiSource={['ai']} />)
    const previous = [
      { SessionID: 'other', Title: 'same title', Source: 'ai' },
      { SessionID: 'bound', Title: 'old title', Source: 'ai' },
      { SessionID: 'older', Title: 'older', Source: 'ai' },
    ] as AISession[]
    const payload = { SessionID: 'bound', Title: 'same title', Source: 'ai' }
    act(() => emiter.emit('sessionData', JSON.stringify({ type: 'prependSession', payload })))
    const update = mocks.dispatcher.setSessions.mock.lastCall![0]
    const next = update(previous)
    expect(next).toEqual([payload, previous[0], previous[2]])
    expect(update(next)).toEqual(next)
    expect(previous).toHaveLength(3)
    expect(previous[1].Title).toBe('old title')

    unmount()
    mocks.dispatcher.setSessions.mockClear()
    act(() => emiter.emit('sessionData', JSON.stringify({ type: 'prependSession', payload })))
    expect(mocks.dispatcher.setSessions).not.toHaveBeenCalled()
  })

  it('新会话绑定事件不会加入其他来源的列表', () => {
    render(<HistoryChat aiSource={['webFuzzer']} />)
    mocks.dispatcher.setSessions.mockClear()
    act(() =>
      emiter.emit(
        'sessionData',
        JSON.stringify({
          type: 'prependSession',
          payload: { SessionID: 'agent-session', Source: 'ai' },
        }),
      ),
    )
    expect(mocks.dispatcher.setSessions).not.toHaveBeenCalled()
  })

  it('默认保留新建与固定按钮', async () => {
    render(<HistoryChat aiSource={['ai']} />)

    const buttons = screen.getAllByRole('button')
    expect(buttons).toHaveLength(3)
    fireEvent.mouseEnter(buttons[1])
    expect(await screen.findByRole('tooltip')).toHaveTextContent('HistoryChat.newChat')
    expect(screen.getByRole('button', { name: '固定' })).toBeInTheDocument()
    expect(screen.getByText('历史会话内容')).toBeInTheDocument()
  })

  it('隐藏固定按钮时保留新建行为，额外操作位于同一行最右侧', () => {
    const onClose = vi.fn()
    const onChatEvent = vi.fn()
    emiter.on('onReActChatEvent', onChatEvent)
    try {
      render(
        <HistoryChat
          aiSource={['ai']}
          hidePinButton
          headerActionsExtra={<button onClick={onClose}>关闭会话列表</button>}
        />,
      )

      // 头部按钮依次为清空、新建和传入的关闭操作。
      const buttons = screen.getAllByRole('button')
      expect(buttons).toHaveLength(3)
      const newChatButton = buttons[1]
      const closeButton = screen.getByRole('button', { name: '关闭会话列表' })
      expect(screen.queryByRole('button', { name: '固定' })).not.toBeInTheDocument()
      expect(closeButton.parentElement).toBe(newChatButton.parentElement)
      expect(closeButton.parentElement?.lastElementChild).toBe(closeButton)

      fireEvent.click(newChatButton)
      expect(onChatEvent).toHaveBeenCalledWith(JSON.stringify({ type: ReActChatEventEnum.NEW_CHAT }))
      fireEvent.click(closeButton)
      expect(onClose).toHaveBeenCalledTimes(1)
    } finally {
      emiter.off('onReActChatEvent', onChatEvent)
    }
  })

  it('embedded 仍隐藏新建和固定按钮，并在挂载时刷新会话', () => {
    render(<HistoryChat aiSource={['ai']} embedded hidePinButton={false} />)

    expect(screen.getAllByRole('button')).toHaveLength(1)
    expect(screen.queryByRole('button', { name: '固定' })).not.toBeInTheDocument()
    expect(screen.getByText('历史会话内容')).toBeInTheDocument()
    expect(mocks.dispatcher.loadHistoryData).toHaveBeenCalledWith(true)
  })
})

describe('HistoryChat 删除与多开刷新', () => {
  it('按天清理删到当前会话：回欢迎页，不再切到剩余会话', async () => {
    const oldChat = { SessionID: 'old', UpdatedAt: 0 }
    const recentChat = { SessionID: 'recent', UpdatedAt: Date.now() }
    mocks.ctx.sessions = [oldChat, recentChat]
    mocks.ctx.activeChat = oldChat
    const onChatEvent = vi.fn()
    emiter.on('onReActChatEvent', onChatEvent)
    try {
      render(<HistoryChat aiSource={['ai']} />)
      fireEvent.click(screen.getAllByRole('button')[0]) // 清空
      fireEvent.click(await screen.findByText('HistoryChat.oneDay'))
      fireEvent.click(await screen.findByRole('button', { name: 'YakitButton.ok' }))
      await waitFor(() => expect(mocks.dispatcher.setSessions).toHaveBeenCalledWith([recentChat]))
      expect(onChatEvent).toHaveBeenCalledWith(JSON.stringify({ type: ReActChatEventEnum.NEW_CHAT }))
      expect(mocks.setActiveChat).toHaveBeenCalledExactlyOnceWith(undefined)
    } finally {
      emiter.off('onReActChatEvent', onChatEvent)
    }
  })

  it('多开 Tab 由隐藏切回可见时刷新历史；embedded 不受可见性影响', () => {
    mocks.viewport.visible = false
    const { rerender, unmount } = render(<HistoryChat aiSource={['ai']} />)
    expect(mocks.dispatcher.loadHistoryData).not.toHaveBeenCalled()
    mocks.viewport.visible = true
    rerender(<HistoryChat aiSource={['ai']} />)
    expect(mocks.dispatcher.loadHistoryData).toHaveBeenCalledExactlyOnceWith(true)
    unmount()

    // embedded：aiSource 保持同一引用，避免重跑挂载刷新
    const aiSource: AISource[] = ['ai']
    mocks.viewport.visible = false
    const embedded = render(<HistoryChat aiSource={aiSource} embedded />)
 mocks.dispatcher.loadHistoryData.mockClear() // 排除挂载时的那次刷新
 mocks.viewport.visible = true
 embedded.rerender(<HistoryChat aiSource={aiSource} embedded className="visible" />)
    expect(mocks.dispatcher.loadHistoryData).not.toHaveBeenCalled()
  })
})

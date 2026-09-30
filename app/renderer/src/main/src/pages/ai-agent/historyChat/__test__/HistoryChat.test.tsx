import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import HistoryChat from '../HistoryChat'
import emiter from '@/utils/eventBus/eventBus'
import { ReActChatEventEnum } from '../../defaultConstant'
import type { AISession } from '../../type/aiChat'
import type { AISource } from '@/pages/ai-re-act/hooks/grpcApi'

const mocks = vi.hoisted(() => ({
  dispatcher: {
    setSessions: vi.fn(),
    resetPagination: vi.fn(),
    loadHistoryData: vi.fn().mockResolvedValue(0),
  },
  setActiveChat: vi.fn(),
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
vi.mock('@/store/pageInfo', () => ({ usePageInfo: () => 'ai-agent' }))
vi.mock('@/pages/ai-re-act/hooks/ChatMultiSessionController', () => ({
  globalSessionEngine: { getSessionIdsBySourceAndRoute: () => [] },
}))

beforeEach(() => {
  vi.clearAllMocks()
  mocks.ctx.activeChat = undefined
  mocks.ctx.sessions = []
  mocks.viewport.visible = true
})

describe('HistoryChat 头部操作', () => {
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

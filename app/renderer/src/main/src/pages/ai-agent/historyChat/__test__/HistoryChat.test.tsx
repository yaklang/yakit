import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import HistoryChat from '../HistoryChat'
import emiter from '@/utils/eventBus/eventBus'
import { ReActChatEventEnum } from '../../defaultConstant'

const mocks = vi.hoisted(() => ({
  dispatcher: {
    setSessions: vi.fn(),
    resetPagination: vi.fn(),
    loadHistoryData: vi.fn().mockResolvedValue(0),
  },
}))

vi.mock('../../useContext/useStore', () => ({ default: () => ({ activeChat: undefined }) }))
vi.mock('../../useContext/useDispatcher', () => ({ default: () => ({ getSetting: () => ({ Source: 'ai' }) }) }))
vi.mock('@/i18n/useI18nNamespaces', () => ({ useI18nNamespaces: () => ({ t: (key: string) => key }) }))
vi.mock('../HistoryChatList/hook/useSessionList', () => ({
  default: () => [{ sessions: [] }, mocks.dispatcher],
}))
vi.mock('../HistoryChatList/HistoryChatList', () => ({
  default: () => <div>历史会话内容</div>,
  DAY_MS: 86400000,
  getChatTimestamp: () => 0,
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
})

describe('HistoryChat 头部操作', () => {
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

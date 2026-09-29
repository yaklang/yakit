import '../../../ai-re-act/hooks/__test__/setupElectron'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createStore } from 'zustand/vanilla'
import type { AIChatSubmitParams } from '../type'
import { AIAgentChat } from '../AIAgentChat'
import emiter from '@/utils/eventBus/eventBus'
import { globalSessionEngine } from '@/pages/ai-re-act/hooks/ChatMultiSessionController'
import { ReActChatEventEnum } from '../../defaultConstant'

const mocks = vi.hoisted(() => ({
  activeChat: undefined as { SessionID: string } | undefined,
  startChat: vi.fn(),
  cancelPendingChat: vi.fn(),
  onClose: vi.fn(),
  setActiveChat: vi.fn(),
  setSetting: vi.fn(),
}))
vi.mock('../../useContext/useStore', () => ({
  default: () => ({ activeChat: mocks.activeChat, pageId: 'test-tab', pendingChat: { status: 'connecting' } }),
}))
vi.mock('../../useContext/useDispatcher', () => ({ default: () => ({ ...mocks, onStart: vi.fn() }) }))
vi.mock('@/pages/ai-re-act/hooks/useStartAIChat', () => ({ useStartAIChat: () => mocks.startChat }))
vi.mock('@/pages/ai-re-act/hooks/useCurrentSessionId', () => ({ default: () => mocks.activeChat?.SessionID || '' }))
vi.mock('@/pages/ai-re-act/hooks/useCurrentDataBySession', () => {
  const store = createStore(() => ({ execute: false }))
  return { useCurrentStore: () => store }
})
vi.mock('@/utils/kv', () => ({ getRemoteValue: vi.fn().mockResolvedValue('false'), setRemoteValue: vi.fn() }))
vi.mock('@/pages/KnowledgeBase/hooks/useMultipleHoldGRPCStream', () => ({ default: () => [[], { tokens: [] }] }))
vi.mock('@/pages/KnowledgeBase/hooks/useKnowledgeBase', () => ({ useKnowledgeBase: () => ({ clearAll: vi.fn() }) }))
vi.mock('@/i18n/useI18nNamespaces', () => ({ useI18nNamespaces: () => ({ t: (key: string) => key }) }))
vi.mock('../../aiModelList/utils', () => ({ isForcedSetAIModal: vi.fn() }))
vi.mock('../../utils', () => ({ onReStart: vi.fn(), createActiveChatSessionId: () => 'client-session' }))
vi.mock('../../grpc', () => ({ grpcGetAIForge: vi.fn() }))
vi.mock('../../aiToolList/utils', () => ({ grpcGetAIToolById: vi.fn() }))
vi.mock('@/pages/plugins/utils', () => ({ apiCancelDebugPlugin: vi.fn() }))
vi.mock('../../components/aiMilkdownInput/utils', () => ({ aiInputWithParamsTemplate: vi.fn() }))
vi.mock('@/pages/ai-agent/components/aiReActChatReview/AIReActChatReview', () => ({ AIReActChatReview: () => null }))
vi.mock('@/components/yakitUI/YakitHint/YakitHint', () => ({ YakitHint: () => null }))
vi.mock('@/components/yakitUI/YakitModal/YakitModalConfirm', () => ({ YakitModalConfirm: () => null }))
vi.mock('../AIAgentChatLayout/AIAgentChatLayout', () => ({
  // 故意不挂载聊天组件、不赋值 aiReActChatRef，验证首问不依赖聊天页挂载。
  AIAgentChatLayout: ({
    mode,
    onTriageSubmit,
  }: {
    mode: string
    onTriageSubmit: (value: AIChatSubmitParams) => void
  }) => (
    <div>
      <span data-testid="mode">{mode}</span>
      <button onClick={() => onTriageSubmit({ qs: 'first question', sessionId: 'image-draft' })}>submit</button>
    </div>
  ),
}))

beforeEach(() => {
  vi.clearAllMocks()
  mocks.activeChat = undefined
  vi.useFakeTimers()
})
afterEach(() => {
  cleanup()
  vi.clearAllTimers()
  vi.useRealTimers()
})

describe('welcome submission', () => {
  it('达到多 Tab 并发上限时保持欢迎页，不丢弃输入去打开空白会话', () => {
    const guard = vi.spyOn(globalSessionEngine, 'canStartExecutingSession').mockReturnValueOnce(false)
    render(<AIAgentChat />)
    fireEvent.click(screen.getByRole('button', { name: 'submit' }))
    expect(guard).toHaveBeenCalledWith(undefined, true)
    expect(mocks.startChat).not.toHaveBeenCalled()
    expect(screen.getByTestId('mode')).toHaveTextContent('welcome')
    guard.mockRestore()
  })

  it.each([undefined, 'history-session'])(
    'welcome starts a new session even with selected history %s',
    async (activeId) => {
      mocks.activeChat = activeId ? { SessionID: activeId } : undefined
      const { unmount } = render(<AIAgentChat />)
      fireEvent.click(screen.getByRole('button', { name: 'submit' }))
      // 没有推进任何 timer，旧的 setTimeout + ref 转发会丢失这次提交。
      expect(mocks.startChat).toHaveBeenCalledExactlyOnceWith({
        qs: 'first question',
        target: { kind: 'new', sessionId: 'image-draft' },
      })
      expect(screen.getByTestId('mode')).toHaveTextContent('re-act')
      act(() =>
        emiter.emit('onReActChatEvent', JSON.stringify({ type: ReActChatEventEnum.NEW_CHAT, pageId: 'test-tab' })),
      )
      expect(screen.getByTestId('mode')).toHaveTextContent('welcome')
      expect(mocks.setActiveChat).toHaveBeenCalledWith(undefined)
      expect(mocks.cancelPendingChat).not.toHaveBeenCalled()
      expect(mocks.onClose).not.toHaveBeenCalled()
      unmount()
      await act(async () => vi.runOnlyPendingTimersAsync())
      expect(mocks.startChat).toHaveBeenCalledTimes(1)
    },
  )
})

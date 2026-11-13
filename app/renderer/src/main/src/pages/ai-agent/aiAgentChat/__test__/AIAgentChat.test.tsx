import '../../../ai-re-act/hooks/__test__/setupElectron'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import cloneDeep from 'lodash/cloneDeep'
import type { AIChatSubmitParams } from '../type'
import { AIAgentChat } from '../AIAgentChat'
import emiter from '@/utils/eventBus/eventBus'
import { globalSessionEngine } from '@/pages/ai-re-act/hooks/ChatMultiSessionController'
import { ReActChatEventEnum } from '../../defaultConstant'
import { onReStart } from '../../utils'
import { StrictMode } from 'react'
import { AIAgentSettingDefault } from '../../defaultConstant'
import { syncAIAgentPageInfo } from '../../utils/syncAIAgentPageInfo'

const mocks = vi.hoisted(() => ({
  activeChat: undefined as { SessionID: string; isDraftSession?: boolean } | undefined,
  startChat: vi.fn(),
  onSubmitResult: vi.fn(),
  cancelPendingChat: vi.fn(),
  onClose: vi.fn(),
  setActiveChat: vi.fn(),
  setSetting: vi.fn(),
  getSetting: vi.fn(),
  openChatInNewTab: false,
  inViewPort: true,
}))
vi.mock('../../useContext/useStore', () => ({
  default: () => ({
    activeChat: mocks.activeChat,
    openChatInNewTab: mocks.openChatInNewTab,
    pageId: 'test-tab',
    pendingChat: { status: 'connecting' },
  }),
}))
vi.mock('../../useContext/useDispatcher', () => ({ default: () => ({ ...mocks, onStart: vi.fn() }) }))
vi.mock('ahooks', async () => ({ ...(await vi.importActual('ahooks')), useInViewport: () => [mocks.inViewPort] }))
vi.mock('@/pages/ai-re-act/hooks/useStartAIChat', () => ({ useStartAIChat: () => mocks.startChat }))
vi.mock('@/pages/ai-re-act/hooks/useCurrentSessionId', () => ({ default: () => mocks.activeChat?.SessionID || '' }))
vi.mock('@/pages/ai-re-act/hooks/useCurrentDataBySession', () => {
  return {
    useCurrentStore: () => globalSessionEngine.ensureSession(mocks.activeChat?.SessionID || '').store.renderStore,
    useCurrentMeta: () => globalSessionEngine.ensureSession(mocks.activeChat?.SessionID || '').meta,
  }
})
vi.mock('@/utils/kv', () => ({ getRemoteValue: vi.fn().mockResolvedValue('false'), setRemoteValue: vi.fn() }))
vi.mock('@/pages/KnowledgeBase/hooks/useMultipleHoldGRPCStream', () => ({ default: () => [[], { tokens: [] }] }))
vi.mock('@/pages/KnowledgeBase/hooks/useKnowledgeBase', () => ({ useKnowledgeBase: () => ({ clearAll: vi.fn() }) }))
vi.mock('@/i18n/useI18nNamespaces', () => ({ useI18nNamespaces: () => ({ t: (key: string) => key }) }))
vi.mock('../../aiModelList/utils', () => ({ isForcedSetAIModal: vi.fn() }))
vi.mock('../../utils', () => ({
  onReStart: vi.fn(),
  createActiveChatSessionId: () => 'client-session',
}))
vi.mock('../../utils/syncAIAgentPageInfo', () => ({ syncAIAgentPageInfo: vi.fn() }))
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
    onTriageSubmit: (value: AIChatSubmitParams) => boolean
  }) => (
    <div>
      <span data-testid="mode">{mode}</span>
      <button onClick={() => onTriageSubmit({ qs: 'first question', sessionId: 'image-draft' })}>submit</button>
      <button onClick={() => mocks.onSubmitResult(onTriageSubmit({ qs: 'first question' }))}>submit-text</button>
    </div>
  ),
}))

beforeEach(() => {
  vi.clearAllMocks()
  mocks.startChat.mockReturnValue(true)
  mocks.activeChat = undefined
  mocks.openChatInNewTab = false
  mocks.inViewPort = true
  mocks.getSetting.mockReturnValue(AIAgentSettingDefault)
  globalSessionEngine.sessionStores.setState(new Map(), true)
  vi.useFakeTimers()
})
afterEach(() => {
  cleanup()
  vi.clearAllTimers()
  vi.useRealTimers()
})

describe('welcome submission', () => {
  it.each([false, true])('欢迎页传递启动接纳结果 %s，仅接纳时切换模式', (accepted) => {
    mocks.startChat.mockReturnValueOnce(accepted)
    render(<AIAgentChat />)

    fireEvent.click(screen.getByRole('button', { name: 'submit-text' }))

    expect(mocks.onSubmitResult).toHaveBeenCalledExactlyOnceWith(accepted)
    expect(screen.getByTestId('mode')).toHaveTextContent(accepted ? 're-act' : 'welcome')
  })

  it('固定欢迎页隐藏时仍响应仅发给自己的重置事件', () => {
    mocks.inViewPort = false
    mocks.openChatInNewTab = true
    mocks.activeChat = { SessionID: 'welcome-session', isDraftSession: true }
    render(<AIAgentChat />)
    act(() => emiter.emit('onReActChatEvent', JSON.stringify({ type: ReActChatEventEnum.NEW_CHAT, pageId: 'other' })))
    expect(mocks.setActiveChat).not.toHaveBeenCalled()
    act(() =>
      emiter.emit('onReActChatEvent', JSON.stringify({ type: ReActChatEventEnum.NEW_CHAT, pageId: 'test-tab' })),
    )
    expect(mocks.setActiveChat).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ isDraftSession: true, SessionID: expect.any(String) }),
    )
  })

  it('一级欢迎页发送只打开新标签并重置自身，会话在新标签中建立且 StrictMode 不重复发送', async () => {
    mocks.openChatInNewTab = true
    mocks.activeChat = { SessionID: 'welcome-session', isDraftSession: true }
    const setting = { ...AIAgentSettingDefault, EnablePlan: true }
    mocks.getSetting.mockReturnValue(setting)
    const opened = vi.fn()
    emiter.on('openPage', opened)
    try {
      const source = render(<AIAgentChat />)
      fireEvent.click(screen.getByRole('button', { name: 'submit' }))
      expect(mocks.startChat).not.toHaveBeenCalled()
      expect(JSON.parse(opened.mock.calls[0][0])).toMatchObject({
        route: 'ai-agent',
        params: { aiAgentPageInfo: { session: { SessionID: 'welcome-session', isDraftSession: true } } },
      })
      expect(mocks.setActiveChat).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({ isDraftSession: true, SessionID: expect.any(String) }),
      )
      expect(mocks.setSetting).toHaveBeenCalledOnce()
      expect(syncAIAgentPageInfo).toHaveBeenCalledWith({
        pageId: 'test-tab',
        aiAgentPageInfo: { defualtAIMentionCommandParams: undefined, forgeExec: undefined },
        emitSessionData: false,
      })
      const { meta, request } = globalSessionEngine.ensureSession('welcome-session')
      expect(request).toEqual(setting)
      expect(request).not.toBe(setting)
      expect(meta.pendingWelcomeInput).toEqual({
        qs: 'first question',
        sessionId: 'image-draft',
      })
      expect(screen.getByTestId('mode')).toHaveTextContent('welcome')
      await act(async () => vi.runOnlyPendingTimersAsync())
      expect(mocks.startChat).not.toHaveBeenCalled()
      source.unmount()

      render(
        <StrictMode>
          <AIAgentChat />
        </StrictMode>,
      )
      await act(async () => vi.runOnlyPendingTimersAsync())
      expect(mocks.startChat).toHaveBeenCalledExactlyOnceWith({
        qs: 'first question',
        target: { kind: 'new', sessionId: 'welcome-session' },
      })
      expect(meta.pendingWelcomeInput).toBeUndefined()
      expect(request).toEqual(setting)
      expect(opened).toHaveBeenCalledOnce()
      expect(screen.getByTestId('mode')).toHaveTextContent('re-act')
      expect(mocks.onClose).not.toHaveBeenCalled()
      expect(mocks.cancelPendingChat).not.toHaveBeenCalled()
    } finally {
      emiter.off('openPage', opened)
    }
  })

  it('新标签只领取自己会话的首问，不影响另一标签的提交', async () => {
    mocks.openChatInNewTab = true
    mocks.activeChat = { SessionID: 'other-welcome', isDraftSession: true }
    const pending = { input: { qs: 'first question' }, setting: AIAgentSettingDefault }
    const { meta, request } = globalSessionEngine.ensureSession('welcome-session')
    Object.assign(meta, {
      pendingWelcomeInput: cloneDeep(pending.input),
    })
    Object.assign(request, cloneDeep(pending.setting))
    render(<AIAgentChat />)
    await act(async () => vi.runOnlyPendingTimersAsync())
    expect(mocks.startChat).not.toHaveBeenCalled()
    expect(meta.pendingWelcomeInput).toEqual(pending.input)
    expect(request).toEqual(pending.setting)
  })

  it('同一会话重复挂载时只领取并发送一次首问', async () => {
    mocks.openChatInNewTab = true
    mocks.activeChat = { SessionID: 'welcome-session', isDraftSession: true }
    const { meta, request } = globalSessionEngine.ensureSession('welcome-session')
    Object.assign(meta, {
      pendingWelcomeInput: { qs: 'first question' },
    })
    Object.assign(request, cloneDeep(AIAgentSettingDefault))
    render(
      <>
        <AIAgentChat />
        <AIAgentChat />
      </>,
    )
    await act(async () => vi.runOnlyPendingTimersAsync())

    expect(mocks.startChat).toHaveBeenCalledExactlyOnceWith({
      qs: 'first question',
      target: { kind: 'new', sessionId: 'welcome-session' },
    })
    expect(meta.pendingWelcomeInput).toBeUndefined()
    expect(request).toEqual(AIAgentSettingDefault)
  })

  it('新标签启动被拒绝时保留首问和配置，不自动反复重试', async () => {
    mocks.openChatInNewTab = true
    mocks.activeChat = { SessionID: 'welcome-session', isDraftSession: true }
    const input = { qs: 'first question' }
    const { meta, request } = globalSessionEngine.ensureSession('welcome-session')
    Object.assign(meta, {
      pendingWelcomeInput: input,
    })
    Object.assign(request, cloneDeep(AIAgentSettingDefault))
    const guard = vi.spyOn(globalSessionEngine, 'canStartExecutingSession').mockReturnValue(false)
    try {
      render(<AIAgentChat />)
      await act(async () => vi.runOnlyPendingTimersAsync())
      await act(async () => vi.runOnlyPendingTimersAsync())

      expect(mocks.startChat).not.toHaveBeenCalled()
      expect(guard).toHaveBeenCalledTimes(1)
      expect(meta.pendingWelcomeInput).toEqual(input)
      expect(request).toEqual(AIAgentSettingDefault)
    } finally {
      guard.mockRestore()
    }
  })

  it('新标签领取首问前卸载时保留会话数据', async () => {
    mocks.openChatInNewTab = true
    mocks.activeChat = { SessionID: 'welcome-session', isDraftSession: true }
    const input = { qs: 'first question' }
    const { meta, request } = globalSessionEngine.ensureSession('welcome-session')
    Object.assign(meta, {
      pendingWelcomeInput: input,
    })
    Object.assign(request, cloneDeep(AIAgentSettingDefault))
    const view = render(<AIAgentChat />)
    view.unmount()
    await act(async () => vi.runOnlyPendingTimersAsync())

    expect(mocks.startChat).not.toHaveBeenCalled()
    expect(meta.pendingWelcomeInput).toEqual(input)
    expect(request).toEqual(AIAgentSettingDefault)
  })

  it('欢迎页纯文本首问使用预分配 ID 创建新会话', () => {
    mocks.activeChat = { SessionID: 'welcome-session', isDraftSession: true }
    render(<AIAgentChat />)
    expect(screen.getByTestId('mode')).toHaveTextContent('welcome')
    expect(onReStart).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'submit-text' }))
    expect(mocks.startChat).toHaveBeenCalledWith(
      expect.objectContaining({ target: { kind: 'new', sessionId: 'welcome-session' } }),
    )
  })
  it('欢迎页图片首问也沿用 activeChat 的 ID', () => {
    mocks.activeChat = { SessionID: 'welcome-session', isDraftSession: true }
    render(<AIAgentChat />)
    fireEvent.click(screen.getByRole('button', { name: 'submit' }))
    expect(mocks.startChat).toHaveBeenCalledWith(
      expect.objectContaining({ target: { kind: 'new', sessionId: 'welcome-session' } }),
    )
  })
  it.each([
    { activeChat: undefined, button: 'submit-text', sessionId: 'client-session' },
    { activeChat: { SessionID: '', isDraftSession: true }, button: 'submit', sessionId: 'image-draft' },
    { activeChat: { SessionID: '', isDraftSession: true }, button: 'submit-text', sessionId: 'client-session' },
    { activeChat: { SessionID: 'history-session' }, button: 'submit-text', sessionId: 'client-session' },
  ])('新建时无法复用欢迎页 ID 则使用输入 ID 或新 ID：%j', ({ activeChat, button, sessionId }) => {
    mocks.activeChat = activeChat
    render(<AIAgentChat />)

    fireEvent.click(screen.getByRole('button', { name: button }))

    expect(mocks.startChat).toHaveBeenCalledWith(expect.objectContaining({ target: { kind: 'new', sessionId } }))
  })
  it('达到多 Tab 并发上限时保持欢迎页，不丢弃输入去打开空白会话', () => {
    mocks.openChatInNewTab = true
    const guard = vi.spyOn(globalSessionEngine, 'canStartExecutingSession').mockReturnValueOnce(false)
    render(<AIAgentChat />)
    fireEvent.click(screen.getByRole('button', { name: 'submit' }))
    expect(guard).toHaveBeenCalledWith(undefined, true)
    expect(mocks.startChat).not.toHaveBeenCalled()
    expect(mocks.setActiveChat).not.toHaveBeenCalled()
    expect(globalSessionEngine.sessionStores.getState().get('client-session')).toBeUndefined()
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
      expect(mocks.setActiveChat).toHaveBeenCalledWith(
        expect.objectContaining({ isDraftSession: true, SessionID: expect.any(String) }),
      )
      expect(mocks.cancelPendingChat).not.toHaveBeenCalled()
      expect(mocks.onClose).not.toHaveBeenCalled()
      unmount()
      await act(async () => vi.runOnlyPendingTimersAsync())
      expect(mocks.startChat).toHaveBeenCalledTimes(1)
    },
  )
})

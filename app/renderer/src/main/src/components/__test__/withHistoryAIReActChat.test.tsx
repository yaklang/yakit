import '../../pages/ai-re-act/hooks/__test__/setupElectron'
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createStore } from 'zustand/vanilla'
import type lodash from 'lodash'
import type * as HistoryAIReActChatModule from '../withHistoryAIReActChat'
import { HistoryAIReActChatProvider, useHistoryAIReActChat } from '../historyAIReActChat'
import { AISourceEnum } from '@/pages/ai-re-act/hooks/grpcApi'
import { YakitRoute } from '@/enums/yakitRoute'
import { compileReactModule } from '@/utils/__test__/helpers/compileReactModule'
import type { AISession } from '@/pages/ai-agent/type/aiChat'
import type { PendingAIChat } from '@/pages/ai-re-act/hooks/ChatMultiSessionController'
import { globalSessionEngine } from '@/pages/ai-re-act/hooks/ChatMultiSessionController'
import useAIAgentStore from '@/pages/ai-agent/useContext/useStore'
import useAIAgentDispatcher from '@/pages/ai-agent/useContext/useDispatcher'

const ipc = vi.hoisted(() => ({
  useChatIPC: vi.fn(),
  cancelPendingChat: vi.fn(),
  onClose: vi.fn(),
  pendingChat: undefined as PendingAIChat | undefined,
}))
beforeEach(() => {
  vi.clearAllMocks()
  ipc.pendingChat = undefined
})

vi.mock('lodash', async (importOriginal) => {
  const original = await importOriginal<{ default: typeof lodash }>()
  return { ...original, clone: original.default.clone, cloneDeep: original.default.cloneDeep }
})
vi.mock('../HistroryAIReActChat', () => ({ HistroryAIReActChat: () => null }))
vi.mock('@/pages/ai-agent/utils', () => ({
  createActiveChatSessionId: vi.fn(),
  getAIReActRequestParams: vi.fn(),
  onReStart: vi.fn(),
}))
vi.mock('@/pages/fuzzer/webFuzzerAiRequestApplyBridge', () => ({
  applyHttpFuzzRequestChangeToWebFuzzerPage: vi.fn(),
  getWebFuzzerPageIsHttps: vi.fn(),
  getWebFuzzerPageRequestString: vi.fn(),
  enqueueWebFuzzerCasualReplaceReview: vi.fn(),
  pushAIFuzzStatusRuntimeIdToWebFuzzerPage: vi.fn(),
}))
vi.mock('@/pages/fuzzer/webFuzzerAiRequestAttachment', () => ({
  appendWebFuzzerRequestRawAttachmentToEvent: vi.fn(),
}))
vi.mock('@/pages/yakRunner/yakRunnerAiCodeApplyBridge', () => ({
  appendYakRunnerWorkspaceContextToEvent: vi.fn(),
  createYakRunnerGeneratedCodeFileName: vi.fn(),
  enqueueYakRunnerCasualCodeReplaceReview: vi.fn(),
  getYakRunnerPageActiveCodeString: vi.fn(),
  resolveYaklangCreateTargetPath: vi.fn(),
}))
vi.mock('@/pages/yakRunner/yakRunnerAiCodePatchApply', () => ({
  normalizeYaklangCodeChangeForReview: vi.fn(),
  resetYakRunnerPatchWorkingDraft: vi.fn(),
}))
vi.mock('@/pages/ai-re-act/hooks/useChatIPC', () => ({
  useChatIPC: (...args: unknown[]) => {
    ipc.useChatIPC(...args)
    return {
      onStart: vi.fn(),
      onSend: vi.fn(),
      onClose: ipc.onClose,
      onUpdatePageId: vi.fn(),
      cancelPendingChat: ipc.cancelPendingChat,
      pendingChat: ipc.pendingChat,
    }
  },
}))
vi.mock('@/pages/ai-re-act/hooks/ChatMultiSessionController', () => {
  const store = createStore(() => ({ currentChatStatus: { status: 'idle' }, execute: false }))
  return { globalSessionEngine: { ensureSession: () => ({ store }), updateSessionConfig: vi.fn() } }
})

function Consumer() {
  const { showFreeChat, setShowFreeChat, historyAIReActChatBridge: bridge } = useHistoryAIReActChat()
  return (
    <>
      <button onClick={() => setShowFreeChat(true)}>{showFreeChat ? 'open' : 'closed'}</button>
      <button onClick={bridge.onNewChat}>new-chat</button>
      <button onClick={bridge.onStop}>stop-chat</button>
      <button onClick={() => bridge.setActiveChat({ SessionID: 'history' } as AISession)}>select-history</button>
    </>
  )
}

const SettingsConsumer = ({ session }: { session: AISession }) => {
  const { setting, activeChat } = useAIAgentStore()
  const { setSetting, setActiveChat } = useAIAgentDispatcher()
  return (
    <>
      <span data-testid="global-setting">{JSON.stringify(setting)}</span>
      <span data-testid="session-params">{JSON.stringify(activeChat?.StartParams)}</span>
      <button
        onClick={() => setSetting((current) => ({ ...current, RuntimeContextSizeLimit: 900, AICallTokenLimit: 40 }))}
      >
        change-default-setting
      </button>
      <button onClick={() => setActiveChat(session)}>select-session</button>
      <button
        onClick={() => {
          setActiveChat((current) =>
            current ? { ...current, StartParams: { ...current.StartParams, RuntimeContextSizeLimit: 600 } } : current,
          )
          setActiveChat((current) =>
            current ? { ...current, StartParams: { ...current.StartParams, SyncPerceptionTrigger: false } } : current,
          )
        }}
      >
        change-session-config
      </button>
    </>
  )
}

function verifyProvider(Provider: typeof HistoryAIReActChatProvider) {
  render(
    <Provider
      source={AISourceEnum.knowledgeBase}
      route={YakitRoute.AI_REPOSITORY}
      pageId={YakitRoute.AI_REPOSITORY}
      focusModeLoop=""
    >
      <Consumer />
    </Provider>,
  )
  fireEvent.click(screen.getByRole('button', { name: 'closed' }))
  expect(screen.getByRole('button', { name: 'open' })).toBeInTheDocument()
}

describe('HistoryAIReActChatProvider', () => {
  it.each([120, 0, undefined])('旧会话上下文阈值 %s 不会随全局设置同步', (limit) => {
    const session = {
      SessionID: 'history',
      StartParams: { EnablePlan: true, ...(limit === undefined ? {} : { RuntimeContextSizeLimit: limit }) },
    } as AISession
    render(
      <HistoryAIReActChatProvider
        source={AISourceEnum.knowledgeBase}
        route={YakitRoute.AI_REPOSITORY}
        pageId={YakitRoute.AI_REPOSITORY}
        focusModeLoop=""
      >
        <SettingsConsumer session={session} />
      </HistoryAIReActChatProvider>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'change-default-setting' }))
    expect(globalSessionEngine.updateSessionConfig).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'select-session' }))
    vi.mocked(globalSessionEngine.updateSessionConfig).mockClear()

    fireEvent.click(screen.getByRole('button', { name: 'change-default-setting' }))

    expect(JSON.parse(screen.getByTestId('session-params').textContent!)).toEqual(session.StartParams)
    expect(globalSessionEngine.updateSessionConfig).toHaveBeenCalledExactlyOnceWith('history', expect.any(Object))
    const config = vi.mocked(globalSessionEngine.updateSessionConfig).mock.calls[0][1]
    expect(config).not.toHaveProperty('RuntimeContextSizeLimit')
    expect(config.AICallTokenLimit).toBe(40)
  })

  it('连续更新保留会话参数，旧阈值元数据不再触发设置同步', () => {
    const session = {
      SessionID: 'history',
      StartParams: { RuntimeContextSizeLimit: 120, SyncPerceptionTrigger: true, EnablePlan: true },
    } as AISession
    render(
      <HistoryAIReActChatProvider
        source={AISourceEnum.knowledgeBase}
        route={YakitRoute.AI_REPOSITORY}
        pageId={YakitRoute.AI_REPOSITORY}
        focusModeLoop=""
      >
        <SettingsConsumer session={session} />
      </HistoryAIReActChatProvider>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'change-default-setting' }))
    fireEvent.click(screen.getByRole('button', { name: 'select-session' }))
    vi.mocked(globalSessionEngine.updateSessionConfig).mockClear()

    const globalSetting = screen.getByTestId('global-setting').textContent
    fireEvent.click(screen.getByRole('button', { name: 'change-session-config' }))

    expect(screen.getByTestId('global-setting').textContent).toBe(globalSetting)
    expect(JSON.parse(screen.getByTestId('session-params').textContent!)).toEqual({
      RuntimeContextSizeLimit: 600,
      SyncPerceptionTrigger: false,
      EnablePlan: true,
    })
    expect(globalSessionEngine.updateSessionConfig).not.toHaveBeenCalled()
    expect(session.StartParams).toEqual({
      RuntimeContextSizeLimit: 120,
      SyncPerceptionTrigger: true,
      EnablePlan: true,
    })
  })

  it.each(['new-chat', 'stop-chat', 'select-history'])('非 Agent 入口通过 %s 取消 pending，保持原有行为', (action) => {
    const store = createStore(() => ({ currentChatStatus: { status: 'idle' }, execute: false }))
    ipc.pendingChat = { streamToken: 'pending', status: 'connecting', data: { store } } as unknown as PendingAIChat
    verifyProvider(HistoryAIReActChatProvider)
    expect(ipc.useChatIPC).toHaveBeenCalledWith(YakitRoute.AI_REPOSITORY, YakitRoute.AI_REPOSITORY)
    fireEvent.click(screen.getByRole('button', { name: action }))
    expect(ipc.cancelPendingChat).toHaveBeenCalledTimes(1)
    expect(ipc.onClose).not.toHaveBeenCalled()
  })

  it('向知识库消费者提供可更新的会话状态', () => {
    verifyProvider(HistoryAIReActChatProvider)
  })

  it('Provider 模块重新执行后仍与已加载的消费者共享 Context', async () => {
    // 模拟热更新只重新执行 Provider 模块，保留已加载的 Hook 及其依赖。
    const reloaded = await compileReactModule<typeof HistoryAIReActChatModule>(
      import.meta.url,
      '../withHistoryAIReActChat.tsx',
    )
    verifyProvider(reloaded.HistoryAIReActChatProvider)
  })

  it('缺少 Provider 时仍明确报错', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      expect(() => render(<Consumer />)).toThrow('useHistoryAIReActChat 必须在 HistoryAIReActChatProvider 内使用')
    } finally {
      consoleError.mockRestore()
    }
  })
})

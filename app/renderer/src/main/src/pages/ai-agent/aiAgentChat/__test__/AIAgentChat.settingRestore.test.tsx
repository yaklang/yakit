import type { ReactNode } from 'react'
import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createStore } from 'zustand/vanilla'
// 先注册 electron stub，避免依赖链顶层 window.require('electron') 报错
import '../../../ai-re-act/hooks/__test__/setupElectron'
import emiter from '@/utils/eventBus/eventBus'
import { ReActChatEventEnum } from '../../defaultConstant'
import { sessionStatusStore, SessionDeleteStatus } from '@/pages/ai-re-act/hooks/sessionStatus/sessionStatusStore'

const { mocks, ctx } = vi.hoisted(() => ({
  mocks: {
    setSetting: vi.fn(),
    setActiveChat: vi.fn(),
    onStart: vi.fn(),
    onClose: vi.fn(),
    onReStart: vi.fn(),
  },
  ctx: { activeChat: undefined as { SessionID: string } | undefined },
}))

vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({ t: (key: string) => key, i18nRefresh: 0 }),
}))

vi.mock('ahooks', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...(actual as object),
    useInViewport: () => [true],
  }
})

vi.mock('../../useContext/useStore', () => ({
  default: () => ({ activeChat: ctx.activeChat, pageId: 'tab-1' }),
}))

vi.mock('../../useContext/useDispatcher', () => ({
  default: () => mocks,
}))

vi.mock('@/pages/ai-re-act/hooks/useCurrentSessionId', () => ({
  default: () => ctx.activeChat?.SessionID || '',
}))

const sessionStore = createStore(() => ({
  execute: false,
  currentReviewDetail: undefined as undefined,
  currentPlanReviewExtraUpdate: 0,
}))

vi.mock('@/pages/ai-re-act/hooks/useCurrentDataBySession', () => ({
  useCurrentStore: () => sessionStore,
  useCurrentRawData: () => ({ contents: new Map() }),
  useCurrentMeta: () => ({ planReviewExtraData: new Map() }),
}))

vi.mock('zustand', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...(actual as object),
    useStore: (_store: unknown, selector: (s: { execute: boolean }) => unknown) => selector({ execute: false }),
  }
})

vi.mock('@/pages/KnowledgeBase/hooks/useMultipleHoldGRPCStream', () => ({
  default: () => [undefined, {}],
}))

vi.mock('@/pages/KnowledgeBase/hooks/useKnowledgeBase', () => ({
  useKnowledgeBase: () => ({ knowledgeBases: [] }),
}))

vi.mock('@/utils/kv', () => ({
  getRemoteValue: vi.fn().mockResolvedValue(''),
  setRemoteValue: vi.fn(),
}))

vi.mock('@/utils/notification', () => ({
  failed: vi.fn(),
  yakitNotify: vi.fn(),
}))

vi.mock('../../aiModelList/utils', () => ({
  isForcedSetAIModal: vi.fn().mockResolvedValue(false),
}))

vi.mock('../../grpc', () => ({
  grpcGetAIForge: vi.fn(),
}))

vi.mock('../../aiToolList/utils', () => ({
  grpcGetAIToolById: vi.fn(),
}))

vi.mock('../../utils', () => ({
  onReStart: mocks.onReStart,
}))

vi.mock('../AIAgentChatLayout/AIAgentChatLayout', () => ({
  AIAgentChatLayout: ({ mode }: { mode: string }) => <div data-testid="ai-agent-chat-layout" data-mode={mode} />,
}))

vi.mock('@/components/yakitUI/YakitHint/YakitHint', () => ({
  YakitHint: () => null,
}))

vi.mock('@/components/yakitUI/YakitModal/YakitModalConfirm', () => ({
  YakitModalConfirm: () => ({ destroy: vi.fn() }),
}))

vi.mock('@/pages/ai-agent/components/aiReActChatReview/AIReActChatReview', () => ({
  AIReActChatReview: () => null,
}))

vi.mock('react-i18next', () => ({
  Trans: ({ children }: { children?: ReactNode }) => <>{children}</>,
  initReactI18next: { type: '3rdParty', init: () => undefined },
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'zh' } }),
}))

const { AIAgentChat } = await import('../AIAgentChat')
const initialStatus = sessionStatusStore.getState()
const mode = () => screen.getByTestId('ai-agent-chat-layout').getAttribute('data-mode')
const markDeleted = (id: string) =>
  act(() => sessionStatusStore.getState().setSessionsDeleteStatus([id], SessionDeleteStatus.Deleted))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  ctx.activeChat = undefined
  sessionStatusStore.setState(initialStatus, true) // zustand 4.4.1 没有 getInitialState
})

beforeEach(() => {
  mocks.setSetting.mockClear()
  mocks.setActiveChat.mockClear()
})

describe('AIAgentChat SingleModelMode 生命周期', () => {
  it('NEW_CHAT 事件会将 SingleModelMode 重置为 false', async () => {
    render(<AIAgentChat />)

    await waitFor(() => {
      // 监听已挂上（inViewPort=true）
      expect(true).toBe(true)
    })

    act(() => {
      emiter.emit('onReActChatEvent', JSON.stringify({ type: ReActChatEventEnum.NEW_CHAT, pageId: 'tab-1' }))
    })

    await waitFor(() => expect(mocks.setSetting).toHaveBeenCalled())
    const updater = mocks.setSetting.mock.calls[0][0] as (old: Record<string, unknown>) => Record<string, unknown>
    const next = updater({
      SingleModelMode: true,
      EnablePlan: true,
      SyncPerceptionTrigger: true,
      Strategy: { EnableMultiAgent: true, EnableGoalMode: true },
    })
    expect(next).toMatchObject({
      SingleModelMode: false,
      EnablePlan: false,
      SyncPerceptionTrigger: false,
      Strategy: expect.objectContaining({
        EnableMultiAgent: false,
        EnableGoalMode: false,
      }),
    })
    expect(mocks.setActiveChat).toHaveBeenCalledWith(undefined)
  })
})

describe('AIAgentChat 当前会话在别处被删除', () => {
  it('打开期间当前会话被删除：回欢迎页', () => {
    ctx.activeChat = { SessionID: 's-live' }
    render(<AIAgentChat />)
    expect(mode()).toBe('re-act')
    markDeleted('s-live')
    expect(mode()).toBe('welcome')
    expect(mocks.setActiveChat).toHaveBeenCalledExactlyOnceWith(undefined)
  })

  it('删除其他会话或卸载后不再响应', () => {
    ctx.activeChat = { SessionID: 's-keep' }
    const { unmount } = render(<AIAgentChat />)
    markDeleted('s-other')
    expect(mode()).toBe('re-act')
    unmount()
    markDeleted('s-keep')
    expect(mocks.setActiveChat).not.toHaveBeenCalled()
  })
})

import '../../pages/ai-re-act/hooks/__test__/setupElectron'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { createStore } from 'zustand/vanilla'
import type lodash from 'lodash'
import type * as HistoryAIReActChatModule from '../withHistoryAIReActChat'
import { HistoryAIReActChatProvider, useHistoryAIReActChat } from '../historyAIReActChat'
import { AISourceEnum } from '@/pages/ai-re-act/hooks/grpcApi'
import { YakitRoute } from '@/enums/yakitRoute'
import { compileReactModule } from '@/utils/__test__/helpers/compileReactModule'

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
  useChatIPC: () => ({ onStart: vi.fn(), onSend: vi.fn(), onClose: vi.fn(), onUpdatePageId: vi.fn() }),
}))
vi.mock('@/pages/ai-re-act/hooks/ChatMultiSessionController', () => {
  const store = createStore(() => ({ currentChatStatus: { status: 'idle' }, execute: false }))
  return { globalSessionEngine: { ensureSession: () => ({ store }), updateSessionConfig: vi.fn() } }
})

function Consumer() {
  const { showFreeChat, setShowFreeChat } = useHistoryAIReActChat()
  return <button onClick={() => setShowFreeChat(true)}>{showFreeChat ? 'open' : 'closed'}</button>
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

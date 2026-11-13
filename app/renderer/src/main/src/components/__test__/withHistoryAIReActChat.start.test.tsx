import '../../pages/ai-re-act/hooks/__test__/setupElectron'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { useEffect } from 'react'
import type lodash from 'lodash'
import { HistoryAIReActChatProvider, useHistoryAIReActChat } from '../historyAIReActChat'
import { globalSessionEngine } from '@/pages/ai-re-act/hooks/ChatMultiSessionController'
import { useStartAIChat } from '@/pages/ai-re-act/hooks/useStartAIChat'
import useAIAgentStore from '@/pages/ai-agent/useContext/useStore'
import useAIAgentDispatcher from '@/pages/ai-agent/useContext/useDispatcher'
import { AISourceEnum, type AIOutputEvent } from '@/pages/ai-re-act/hooks/grpcApi'
import type { AIReActChatProps } from '@/pages/ai-re-act/aiReActChat/AIReActChatType'
import { ipcRendererMock, resetIpcMocks } from '../../pages/ai-re-act/hooks/__test__/setupElectron'
import { makeGrpcJsonRes } from '../../pages/ai-re-act/hooks/__test__/fixtures'
import { applyHttpFuzzRequestChangeToWebFuzzerPage } from '@/pages/fuzzer/webFuzzerAiRequestApplyBridge'
import { YakitRoute } from '@/enums/yakitRoute'
import type { AISession } from '@/pages/ai-agent/type/aiChat'

vi.mock('lodash', async (importOriginal) => {
  const original = await importOriginal<{ default: typeof lodash }>()
  return { ...original.default, ...original }
})
vi.mock('lottie-web', () => ({ default: vi.fn() }))
vi.mock('@/utils/notification', () => ({ yakitNotify: vi.fn() }))
vi.mock('@/pages/ai-agent/grpc', () => ({ grpcQueryAIEvent: vi.fn().mockResolvedValue({ Events: [] }) }))
vi.mock('@/pages/ai-re-act/hooks/AIAgentLogEmitter', () => ({ aiAgentLogEmitter: { dispatch: vi.fn() } }))
vi.mock('@/pages/ai-re-act/hooks/persist/aiChatPersistStore', () => ({
  default: {
    deleteSessionPersist: vi.fn().mockResolvedValue(undefined),
    setSessionRender: vi.fn().mockResolvedValue(undefined),
    setSessionContent: vi.fn().mockResolvedValue(undefined),
    setSessionReference: vi.fn().mockResolvedValue(undefined),
  },
}))
vi.mock('@/pages/fuzzer/webFuzzerAiRequestApplyBridge', () => ({
  getWebFuzzerPageRequestString: () => 'GET / HTTP/1.1\r\nHost: example.com\r\n\r\n',
  getWebFuzzerPageIsHttps: () => false,
  applyHttpFuzzRequestChangeToWebFuzzerPage: vi.fn(),
  enqueueWebFuzzerCasualReplaceReview: vi.fn(),
  pushAIFuzzStatusRuntimeIdToWebFuzzerPage: vi.fn(),
}))
vi.mock('@/pages/yakRunner/yakRunnerAiCodeApplyBridge', () => ({
  appendYakRunnerWorkspaceContextToEvent: (_pageId: string, event: unknown) => event,
  getYakRunnerPageActiveCodeString: () => '',
  createYakRunnerGeneratedCodeFileName: vi.fn(),
  enqueueYakRunnerCasualCodeReplaceReview: vi.fn(),
  resolveYaklangCreateTargetPath: vi.fn(),
}))
vi.mock('@/pages/yakRunner/yakRunnerAiCodePatchApply', () => ({
  normalizeCodeChangeForReview: vi.fn(),
  resetYakRunnerPatchWorkingDraft: vi.fn(),
}))

// 只替换编辑器外壳，保留 Provider → 启动 Hook → useChatIPC → Controller 的真实调用链。
vi.mock('../HistroryAIReActChat', () => ({
  HistroryAIReActChat: function Chat({ onStartRequest }: { onStartRequest: AIReActChatProps['startRequest'] }) {
    const start = useStartAIChat({ startRequest: onStartRequest })
    const { activeChat, setting } = useAIAgentStore()
    const { setSetting } = useAIAgentDispatcher()
    // 模拟聊天外壳初始化配置，避免测试依赖远程配置加载。
    useEffect(() => setSetting(setting), [])
    return (
      <button
        onClick={() =>
          start({
            qs: 'first question',
            target: { kind: activeChat ? 'resume' : 'new', sessionId: activeChat?.SessionID || 'client-session' },
          })
        }
      >
        submit
      </button>
    )
  },
}))

function Consumer() {
  const { renderHistoryAIReActChat, historyAIReActChatBridge: bridge } = useHistoryAIReActChat()
  return (
    <>
      {['history-a', 'history-b'].map((sessionId) => (
        <button
          key={sessionId}
          onClick={() =>
            bridge.setActiveChat({
              SessionID: sessionId,
              Source: AISourceEnum.webFuzzer,
              StartParams: { Source: AISourceEnum.webFuzzer },
            } as AISession)
          }
        >
          {sessionId}
        </button>
      ))}
      <span data-testid="active-session">{bridge.activeID}</span>
      {renderHistoryAIReActChat({ externalParameters: {} })}
    </>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  resetIpcMocks()
})
afterEach(async () => {
  cleanup()
  // 主进程由 IPC mock 替代，不会主动回传 end，因此显式完成收尾并释放定时器。
  const sessionIds = ['client-session', 'history-a', 'history-b']
  // 错误恢复用例会让收尾返回已注入的错误，仍需完成所有会话的清理。
  await Promise.allSettled(sessionIds.map((sessionId) => globalSessionEngine.handleSessionEnd(sessionId)))
  await globalSessionEngine.deleteSessions({ sessionIds })
})

const starts = () => ipcRendererMock.invoke.mock.calls.filter(([method]) => method === 'start-ai-re-act')
const questions = () =>
  ipcRendererMock.invoke.mock.calls.filter(([method, , request]) => method === 'send-ai-re-act' && request.IsFreeInput)
const emit = async (token: string, event: AIOutputEvent) => {
  const listener = ipcRendererMock.on.mock.calls.find(([channel]) => channel === `${token}-data`)![1]
  await act(async () => {
    listener({}, event)
    for (let i = 0; i < 30; i++) await Promise.resolve()
  })
}

it.each([
  [YakitRoute.HTTPFuzzer, AISourceEnum.webFuzzer],
  [YakitRoute.YakScript, AISourceEnum.yakRunner],
  [YakitRoute.AI_REPOSITORY, AISourceEnum.knowledgeBase],
] as const)('%s 首问不提前占用会话，握手后订阅桥接并只发送一次', async (route, source) => {
  render(
    <HistoryAIReActChatProvider source={source} route={route} pageId="test-page" focusModeLoop="">
      <Consumer />
    </HistoryAIReActChatProvider>,
  )
  fireEvent.click(screen.getByRole('button', { name: 'submit' }))
  await waitFor(() => expect(starts()).toHaveLength(1))
  const [, token, request] = starts()[0]
  expect(request.Params).toMatchObject({ TimelineSessionID: 'client-session', Source: source, Attach: false })
  expect(globalSessionEngine.sessionStores.getState().has('client-session')).toBe(false)
  expect(questions()).toHaveLength(0)

  const change = { op: 'replace', request: { raw: 'GET /changed HTTP/1.1\r\n\r\n' } }
  if (route === YakitRoute.HTTPFuzzer) {
    await emit(token, makeGrpcJsonRes('http_fuzz_request_change', change, { SessionId: 'client-session' }))
    expect(applyHttpFuzzRequestChangeToWebFuzzerPage).not.toHaveBeenCalled()
  }
  await emit(token, makeGrpcJsonRes('pong', {}, { SessionId: 'client-session' }))
  expect(globalSessionEngine.isSessionReady('client-session')).toBe(true)
  expect(questions()).toHaveLength(1)
  expect(questions()[0][2].FreeInput).toBe('first question')
  if (route === YakitRoute.HTTPFuzzer) {
    expect(applyHttpFuzzRequestChangeToWebFuzzerPage).toHaveBeenCalledExactlyOnceWith('test-page', change)
  }

  // 已登记会话关闭后仍能按历史恢复，首问必须等待恢复完成。
  await act(async () => globalSessionEngine.handleSessionEnd('client-session'))
  fireEvent.click(screen.getByRole('button', { name: 'submit' }))
  await waitFor(() => expect(starts()).toHaveLength(2))
  const [, retryToken] = starts()[1]
  expect(retryToken).not.toBe(token)
  await emit(retryToken, makeGrpcJsonRes('pong', {}, { SessionId: 'client-session' }))
  expect(questions()).toHaveLength(1)
  await emit(retryToken, makeGrpcJsonRes('structured', { next_start_id: 0 }, { NodeId: 'recovery_history' }))
  expect(questions()).toHaveLength(2)
})

it.each([
  { scenario: '普通历史切换', sendAfterDisconnect: false, recovery: { next_start_id: 0 }, failed: false },
  { scenario: '断连后发送问题恢复', sendAfterDisconnect: true, recovery: { next_start_id: 0 }, failed: false },
  { scenario: '恢复返回错误', sendAfterDisconnect: true, recovery: { error: 'recovery failed' }, failed: true },
  { scenario: '恢复响应缺少游标', sendAfterDisconnect: true, recovery: {}, failed: true },
])('历史 A 不替换当前 B 的桥接订阅：$scenario', async ({ sendAfterDisconnect, recovery, failed }) => {
  render(
    <HistoryAIReActChatProvider
      source={AISourceEnum.webFuzzer}
      route={YakitRoute.HTTPFuzzer}
      pageId="test-page"
      focusModeLoop=""
    >
      <Consumer />
    </HistoryAIReActChatProvider>,
  )
  fireEvent.click(screen.getByRole('button', { name: 'history-a' }))
  await waitFor(() => expect(starts()).toHaveLength(1))
  let tokenA = starts()[0][1]
  if (sendAfterDisconnect) {
    await emit(tokenA, makeGrpcJsonRes('pong', {}, { SessionId: 'history-a' }))
    await emit(tokenA, makeGrpcJsonRes('structured', { next_start_id: 0 }, { NodeId: 'recovery_history' }))
    await act(async () => globalSessionEngine.handleSessionEnd('history-a'))
    expect(globalSessionEngine.getSessionExecute('history-a')).toBe(false)
    fireEvent.click(screen.getByRole('button', { name: 'submit' }))
    await waitFor(() => expect(starts()).toHaveLength(2))
    tokenA = starts()[1][1]
    expect(starts()[1][2].Params.UserQuery).toBe('first question')
  }

  fireEvent.click(screen.getByRole('button', { name: 'history-b' }))
  await waitFor(() => expect(starts()).toHaveLength(sendAfterDisconnect ? 3 : 2))
  const tokenB = starts()[starts().length - 1][1]
  await emit(tokenB, makeGrpcJsonRes('pong', {}, { SessionId: 'history-b' }))
  await emit(tokenB, makeGrpcJsonRes('structured', { next_start_id: 0 }, { NodeId: 'recovery_history' }))
  const changeB = { op: 'replace', request: { raw: 'GET /from-b HTTP/1.1\r\n\r\n' } }
  await emit(tokenB, makeGrpcJsonRes('http_fuzz_request_change', changeB, { SessionId: 'history-b' }))
  expect(applyHttpFuzzRequestChangeToWebFuzzerPage).toHaveBeenCalledExactlyOnceWith('test-page', changeB)

  // A 在 B 之后恢复完成。当前工具页必须继续订阅 B，不能接受 A 的修改。
  await emit(tokenA, makeGrpcJsonRes('pong', {}, { SessionId: 'history-a' }))
  await emit(tokenA, makeGrpcJsonRes('structured', recovery, { NodeId: 'recovery_history' }))
  expect(screen.getByTestId('active-session')).toHaveTextContent('history-b')
  expect(questions()).toHaveLength(sendAfterDisconnect && !failed ? 1 : 0)
  if (failed) {
    expect(ipcRendererMock.invoke).toHaveBeenCalledWith('cancel-ai-re-act', tokenA)
    await act(async () => {
      await expect(globalSessionEngine.handleSessionEnd('history-a')).rejects.toThrow(
        'error' in recovery ? recovery.error : 'ChatSessionNotify.invalidHistoryCursor',
      )
    })
  }
  vi.mocked(applyHttpFuzzRequestChangeToWebFuzzerPage).mockClear()
  const nextChangeB = { op: 'replace', request: { raw: 'GET /from-b-again HTTP/1.1\r\n\r\n' } }
  await emit(tokenB, makeGrpcJsonRes('http_fuzz_request_change', nextChangeB, { SessionId: 'history-b' }))
  const changeA = { op: 'replace', request: { raw: 'GET /from-a HTTP/1.1\r\n\r\n' } }
  await emit(tokenA, makeGrpcJsonRes('http_fuzz_request_change', changeA, { SessionId: 'history-a' }))
  expect(vi.mocked(applyHttpFuzzRequestChangeToWebFuzzerPage).mock.calls).toEqual([['test-page', nextChangeB]])
})

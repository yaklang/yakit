import './setupElectron'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ChatMultiSessionController } from '../ChatMultiSessionController'
import { AIChatQSDataTypeEnum } from '../aiRender'
import { AITaskStatus } from '../grpcApi'
import { YakitRoute } from '@/enums/yakitRoute'
import { ipcRendererMock, resetIpcMocks } from './setupElectron'
import { makeGrpcJsonRes } from './fixtures'
import { yakitNotify } from '@/utils/notification'
import { useStore } from '@/store'
import i18n from '@/i18n/i18n'

const tAgent = i18n.getFixedT(null, 'aiAgent')

vi.mock('@/utils/notification', () => ({ yakitNotify: vi.fn() }))
vi.mock('@/pages/ai-agent/grpc', () => ({
  grpcQueryAIEvent: vi.fn().mockResolvedValue({ Events: [] }),
}))
vi.mock('../persist/contentPersistHelper', () => ({
  persistIndependentItem: vi.fn(),
  persistToolResultIfTerminal: vi.fn(),
  drainSessionContentWrites: vi.fn().mockResolvedValue([]),
  upsertSessionContent: vi.fn(),
  applyHydratedStageSettled: (content: any) => {
    if (content && content.stageSettled !== false) content.stageSettled = true
    return content
  },
}))
vi.mock('../persist/aiChatPersistStore', () => ({
  default: {
    getSessionRender: vi.fn().mockResolvedValue(undefined),
    setSessionRender: vi.fn().mockResolvedValue(undefined),
    getSessionContents: vi.fn().mockResolvedValue([]),
    getSessionReferences: vi.fn().mockResolvedValue([]),
    deleteSessionPersist: vi.fn().mockResolvedValue(undefined),
    deletePersistBySource: vi.fn().mockResolvedValue(undefined),
    deleteAllPersist: vi.fn().mockResolvedValue(undefined),
  },
}))
vi.mock('../AIAgentLogEmitter', () => ({
  aiAgentLogEmitter: { dispatch: vi.fn(), clearSessionBuffer: vi.fn() },
  AIAgentLogEmitter: class {},
}))

const startParams = (sessionId: string, pageId = 'page-1', userQuery = '') => ({
  token: sessionId,
  route: YakitRoute.AI_Agent,
  pageId,
  params: {
    Params: {
      Source: 'ai',
      UserQuery: userQuery,
    },
  } as any,
})

const finishRecovery = (ctrl: ChatMultiSessionController, sessionId: string) =>
  ctrl.handleGrpcOutputEvent(
    sessionId,
    makeGrpcJsonRes('structured', { next_start_id: 0 }, { NodeId: 'recovery_history' }),
  )

const setLogin = (isLogin: boolean) => {
  const { userInfo, setStoreUserInfo } = useStore.getState()
  setStoreUserInfo({ ...userInfo, isLogin })
}

describe('ChatMultiSessionController concurrency / working / close', () => {
  let ctrl: ChatMultiSessionController
  const sessions = new Set<string>()

  const start = async (id: string, pageId = 'page-1') => {
    sessions.add(id)
    expect(ctrl.handleStartSession(startParams(id, pageId))).toBe(true)
    await ctrl.ensureSession(id).meta.lifecycle.preparation
    await finishRecovery(ctrl, id)
  }

  const markWorkingViaPendingReply = (id: string) => {
    ctrl.ensureSession(id).store.getState().updateState({ execute: true, pendingReply: true })
  }

  beforeEach(() => {
    resetIpcMocks()
    vi.clearAllMocks()
    setLogin(false)
    ctrl = new ChatMultiSessionController()
    sessions.clear()
  })

  afterEach(async () => {
    for (const id of sessions) {
      if (ctrl.isSessionReady(id) || ctrl.isSessionClosing(id)) {
        await ctrl.handleSessionEnd(id).catch(() => {})
      }
    }
    setLogin(false)
  })

  it('canStartExecutingSession blocks at logged-out limit(2) and allows already-working session; notify warns', async () => {
    expect(ctrl.getMaxExecutingSessions()).toBe(2)
    await start('s1')
    await start('s2')
    markWorkingViaPendingReply('s1')
    markWorkingViaPendingReply('s2')
    expect(ctrl.getWorkingSessionCount()).toBe(2)

    expect(ctrl.canStartExecutingSession(undefined, true)).toBe(false)
    // 未登录：可点登录的 toast，文案在 message 节点里
    expect(yakitNotify).toHaveBeenCalledWith(
      'warning',
      expect.objectContaining({
        message: expect.anything(),
      }),
    )
    const [, payload] = vi.mocked(yakitNotify).mock.calls[0]
    const msg =
      typeof payload === 'object' && payload && 'message' in payload
        ? (payload as { message: unknown }).message
        : payload
    expect(String((msg as { props?: { children?: unknown } })?.props?.children ?? msg)).toContain('2')

    // 本会话已在执行中：不受上限拦截
    expect(ctrl.canStartExecutingSession('s1', true)).toBe(true)

    // notify=false 不重复告警
    vi.mocked(yakitNotify).mockClear()
    expect(ctrl.canStartExecutingSession(undefined, false)).toBe(false)
    expect(yakitNotify).not.toHaveBeenCalled()
  })

  it('canStartExecutingSession uses logged-in limit(5)', async () => {
    setLogin(true)
    expect(ctrl.getMaxExecutingSessions()).toBe(5)
    for (let i = 1; i <= 5; i++) {
      await start(`login-s${i}`, `page-${i}`)
      markWorkingViaPendingReply(`login-s${i}`)
    }
    expect(ctrl.getWorkingSessionCount()).toBe(5)
    expect(ctrl.canStartExecutingSession(undefined, true)).toBe(false)
    expect(ctrl.canStartExecutingSession('login-s3')).toBe(true)

    // 清一个后可再开
    ctrl.ensureSession('login-s5').store.getState().updateState({ pendingReply: false, execute: true })
    expect(ctrl.getWorkingSessionCount()).toBe(4)
    expect(ctrl.canStartExecutingSession(undefined)).toBe(true)
  })

  it('isSessionWorking uses pendingReply / inProgress, not translated waitingReply title', async () => {
    await start('s-work')
    const { store } = ctrl.ensureSession('s-work')

    // 纯打开历史：execute 可能为 true（连接中），但无进行中任务 / 无 pendingReply → 不算 working
    store.getState().updateState({
      execute: true,
      pendingReply: false,
      currentChatStatus: { questionID: '', coordinatorId: '', status: AITaskStatus.created },
      currentLoadingTitle: { casualTitle: tAgent('AIChatLoading.waitingReply'), planTitle: '' },
    })
    expect(ctrl.isSessionWorking('s-work')).toBe(false)

    // 仅靠标题文案不得判定 working（语言切换后文案会变）
    store.getState().updateState({
      pendingReply: false,
      currentLoadingTitle: { casualTitle: tAgent('AIChatLoading.waitingReply'), planTitle: '' },
    })
    expect(ctrl.isSessionWorking('s-work')).toBe(false)

    // 显式 pendingReply
    store.getState().updateState({ pendingReply: true })
    expect(ctrl.isSessionWorking('s-work')).toBe(true)

    // inProgress
    store.getState().updateState({
      pendingReply: false,
      currentChatStatus: { questionID: 'q1', coordinatorId: '', status: AITaskStatus.inProgress },
    })
    expect(ctrl.isSessionWorking('s-work')).toBe(true)

    // execute=false 直接否
    store.getState().updateState({ execute: false, pendingReply: true })
    expect(ctrl.isSessionWorking('s-work')).toBe(false)

    expect(ctrl.isSessionWorking('ghost')).toBe(false)
  })

  it('isSessionClosing / whenSessionClosed: reopen waits until close resolves', async () => {
    await start('s-close')
    expect(ctrl.isSessionClosing('s-close')).toBe(false)

    ctrl.forceCloseSession({ sessionIds: ['s-close'] })
    expect(ctrl.isSessionClosing('s-close')).toBe(true)
    // 收尾窗口内同 id 不能当成一次新建立
    expect(ctrl.handleStartSession(startParams('s-close'))).toBe(false)

    const closed = ctrl.whenSessionClosed('s-close')
    // 收尾完成前同 id 不能建立（仍在 readyChannels + closing）
    expect(ctrl.handleStartSession(startParams('s-close'))).toBe(false)
    await ctrl.handleSessionEnd('s-close')
    await closed
    // end 后 ready 摘除即可重开；meta.closing 可能仍残留至下次 ensure 换 meta
    expect(ctrl.isSessionReady('s-close')).toBe(false)

    expect(ctrl.handleStartSession(startParams('s-close'))).toBe(true)
    await ctrl.ensureSession('s-close').meta.lifecycle.preparation
    expect(ctrl.isSessionClosing('s-close')).toBe(false)
  })

  it('freezeUnfinishedStreams after cancel marks unfinished streams ended', async () => {
    await start('s-freeze')
    const { store, rawData } = ctrl.ensureSession('s-freeze')
    const streamId = 'ew-unfinished'
    rawData.contents.set(streamId, {
      id: streamId,
      type: AIChatQSDataTypeEnum.STREAM,
      chatType: 'reAct',
      Timestamp: 1,
      AIService: '',
      AIModelName: '',
      data: {
        NodeId: 're-act-loop-thought',
        EventUUID: streamId,
        status: 'start',
        content: 'thinking',
      },
    } as any)
    // 已结束的流不应被改写
    rawData.contents.set('ew-done', {
      id: 'ew-done',
      type: AIChatQSDataTypeEnum.STREAM,
      chatType: 'reAct',
      Timestamp: 1,
      AIService: '',
      AIModelName: '',
      data: {
        NodeId: 're-act-loop-thought',
        EventUUID: 'ew-done',
        status: 'end',
        content: 'done',
      },
    } as any)
    store.getState().dispatchStreamingNode({
      chatType: 'reAct',
      node: { kind: 'item', token: streamId, type: AIChatQSDataTypeEnum.STREAM, nodeId: 're-act-loop-thought' },
    })

    ctrl.forceCloseSession({ sessionIds: ['s-freeze'] })
    expect((rawData.contents.get(streamId) as any).data.status).toBe('end')
    expect((rawData.contents.get('ew-done') as any).data.status).toBe('end')
  })
})

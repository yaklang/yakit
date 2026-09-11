import './setupElectron'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ChatMultiSessionController } from '../ChatMultiSessionController'
import { YakitRoute } from '@/enums/yakitRoute'
import { ipcRendererMock, resetIpcMocks } from './setupElectron'
import { AIInputEventSyncTypeEnum, AITaskStatus } from '../grpcApi'
import { DefaultCurrentExecTaskTree } from '../defaultConstant'
import { makeGrpcJsonRes } from './fixtures'
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

/** 首批历史结束后才允许发送问题或审核；测试主动送回执，不依赖定时等待。 */
const finishRecovery = (ctrl: ChatMultiSessionController, sessionId: string) =>
  ctrl.handleGrpcOutputEvent(
    sessionId,
    makeGrpcJsonRes('structured', { next_start_id: 0 }, { NodeId: 'recovery_history' }),
  )

describe('ChatMultiSessionController page index / ensureSession', async () => {
  let ctrl: ChatMultiSessionController

  beforeEach(async () => {
    resetIpcMocks()
    vi.clearAllMocks()
    ctrl = new ChatMultiSessionController()
  })

  it('A2/A3: ensureSession idempotent and active show', async () => {
    const a = ctrl.ensureSession('s1')
    const b = ctrl.ensureSession('s1')
    expect(a.store).toBe(b.store)
    expect(ctrl.ensureSession('s2').store).not.toBe(a.store)

    ctrl.setActiveShowSession('s1')
    expect(ctrl.isActiveShowSession('s1')).toBe(true)
    expect(ctrl.isActiveShowSession('s2')).toBe(false)
  })

  it('A1/A4: start registers ready + rebind moves page', async () => {
    expect(ctrl.handleStartSession(startParams('s-rebind', 'page-a'))).toBe(true)
    await ctrl.ensureSession('s-rebind').meta.lifecycle.preparation
    expect(ctrl.isSessionReady('s-rebind')).toBe(true)

    ctrl.rebindSessionPageId('s-rebind', 'page-b')
    // still ready after rebind
    expect(ctrl.isSessionReady('s-rebind')).toBe(true)

    // unload old page should not dispose rebound session
    ctrl.onPageUnload(YakitRoute.AI_Agent, 'page-a')
    expect(ctrl.isSessionReady('s-rebind')).toBe(true)

    // wait microtasks from preparePersist
    await Promise.resolve()
  })

  it('A5/A6: updateSessionConfig ignores Source; removeContentsFromMemory is callable', async () => {
    const { request, rawData } = ctrl.ensureSession('s-cfg')
    request.Source = 'ai'
    ctrl.updateSessionConfig('s-cfg', { ReviewPolicy: 'yolo', Source: 'im' } as any)
    expect(request.ReviewPolicy).toBe('yolo')
    expect(request.Source).toBe('ai')

    rawData.contents.set('t1', { id: 't1' } as any)
    ctrl.removeContentsFromMemory('s-cfg', ['t1'])
    expect(rawData.contents.has('t1')).toBe(false)
    expect(() => ctrl.removeContentsFromMemory('ghost')).not.toThrow()
    rawData.contents.set('a', { id: 'a' } as any)
    rawData.contents.set('b', { id: 'b' } as any)
    ctrl.removeContentsFromMemory('s-cfg')
    expect(rawData.contents.size).toBe(0)
    rawData.contents.set('c', { id: 'c' } as any)
    ctrl.removeContentsFromMemory('s-cfg', [])
    expect(rawData.contents.size).toBe(0)
  })

  it('A22: getSessionExecute is read-only and does not create empty pool', async () => {
    expect(ctrl.getSessionExecute('ghost')).toBe(false)
    // 只读查询不得 ensureSession 造池：再 ensure 才应新建
    expect(ctrl.filterExecutingSessionIds(['ghost'])).toEqual([])

    ctrl.handleStartSession(startParams('s-exec'))
    await ctrl.ensureSession('s-exec').meta.lifecycle.preparation
    const { store } = ctrl.ensureSession('s-exec')
    store.getState().updateState({ execute: true })
    expect(ctrl.getSessionExecute('s-exec')).toBe(true)
    expect(ctrl.filterExecutingSessionIds(['s-exec', 'ghost'])).toEqual(['s-exec'])

    store.getState().updateState({ execute: false })
    expect(ctrl.getSessionExecute('s-exec')).toBe(false)
  })

  it('A23: getSessionIdsBySourceAndRoute crosses pageIds', async () => {
    ctrl.handleStartSession(startParams('s-a', 'page-a'))
    await ctrl.ensureSession('s-a').meta.lifecycle.preparation
    ctrl.handleStartSession(startParams('s-b', 'page-b'))
    await ctrl.ensureSession('s-b').meta.lifecycle.preparation
    ctrl.handleStartSession({
      ...startParams('s-im', 'page-a'),
      params: { Params: { Source: 'im', UserQuery: '' } } as any,
    })

    const aiIds = ctrl.getSessionIdsBySourceAndRoute('ai', YakitRoute.AI_Agent).sort()
    expect(aiIds).toEqual(['s-a', 's-b'])
    expect(ctrl.getSessionIdsBySourceAndRoute('im', YakitRoute.AI_Agent)).toEqual(['s-im'])
  })
})

describe('ChatMultiSessionController session api / dispatch', async () => {
  let ctrl: ChatMultiSessionController

  beforeEach(async () => {
    resetIpcMocks()
    ctrl = new ChatMultiSessionController()
    ctrl.handleStartSession(startParams('s-api'))
    await ctrl.ensureSession('s-api').meta.lifecycle.preparation
  })

  it('A7: persist helpers callable', async () => {
    await expect(ctrl.persistGetSessionContents('s-api', ['a'])).resolves.toBeDefined()
    await expect(ctrl.getSessionReferenceMaterials('s-api', ['a'])).resolves.toBeDefined()
    await expect(ctrl.persistDeleteBySource('ai')).resolves.toBeUndefined()
  })

  it('A8: handleGrpcOutputEvent unknown type no throw', async () => {
    await expect(
      ctrl.handleGrpcOutputEvent('s-api', makeGrpcJsonRes('unknown_type_xyz', { a: 1 })),
    ).resolves.toBeUndefined()
  })

  it('A8: session_title via structured NodeId', async () => {
    await ctrl.handleGrpcOutputEvent(
      's-api',
      makeGrpcJsonRes('structured', { title: 'T' }, { NodeId: 'session_title' }),
    )
    expect(ctrl.ensureSession('s-api').rawData.sessionTitle).toBe('T')
  })

  it('A9: pushDataToSession / closeChatReview / updateToolResult', async () => {
    const { store, rawData } = ctrl.ensureSession('s-api')
    const data = {
      id: 'q1',
      type: 'question',
      chatType: 'reAct',
      Timestamp: 1,
      AIService: '',
      AIModelName: '',
      data: 'hi',
    } as any
    ctrl.pushDataToSession('s-api', data)
    expect(rawData.contents.get('q1')).toBeTruthy()

    rawData.contents.set('rev-1', {
      id: 'rev-1',
      type: 'tool_use_review_require',
      chatType: 'reAct',
      data: {},
    } as any)
    rawData.contents.set('rev-stale', {
      id: 'rev-stale',
      type: 'tool_use_review_require',
      chatType: 'reAct',
      data: {},
    } as any)
    store.getState().updateState({ currentReviewDetail: { token: 'rev-1', renderNum: 0 } })
    // token 不匹配时不应清空当前 review
    ctrl.closeChatReview('s-api', 'rev-stale')
    expect(rawData.contents.get('rev-stale')).toBeTruthy()
    expect(store.getState().currentReviewDetail.token).toBe('rev-1')

    ctrl.closeChatReview('s-api', 'rev-1')
    expect(rawData.contents.get('rev-1')).toBeUndefined()
    expect(store.getState().currentReviewDetail.token).toBe('')

    rawData.contents.set('tool-1', {
      id: 'tool-1',
      type: 'tool_result',
      chatType: 'reAct',
      data: { tool: { status: 'default' } },
    } as any)
    ctrl.updateToolResult('s-api', 'tool-1', { status: 'success' })
    expect((rawData.contents.get('tool-1') as any).data.tool.status).toBe('success')
  })
})

describe('ChatMultiSessionController lifecycle', async () => {
  let ctrl: ChatMultiSessionController

  beforeEach(async () => {
    resetIpcMocks()
    vi.clearAllMocks()
    vi.useFakeTimers()
    ctrl = new ChatMultiSessionController()
    ctrl.handleStartSession(startParams('s-life'))
    await ctrl.ensureSession('s-life').meta.lifecycle.preparation
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('A10: handleSessionEnd stops execute', async () => {
    const { store } = ctrl.ensureSession('s-life')
    store.getState().updateState({ execute: true })
    await ctrl.handleSessionEnd('s-life')
    expect(store.getState().execute).toBe(false)
    // i18n 资源加载方式变化时 t 的返回值不定，与同一 tAgent 求值比较而非硬编码
    expect(store.getState().currentLoadingTitle.casualTitle).toBe(tAgent('AIChatLoading.sessionClosed'))
    expect(store.getState().currentChatStatus.status).toBe(AITaskStatus.error)
    expect(ctrl.isSessionReady('s-life')).toBe(false)
  })

  it('A11: forceClose arms fallback end', async () => {
    const onEnd = vi.fn()
    ctrl.forceCloseSession({ sessionIds: ['s-life'], onEnd })
    expect(ipcRendererMock.invoke).toHaveBeenCalledWith('cancel-ai-re-act', 's-life')
    await vi.advanceTimersByTimeAsync(5000)
    expect(onEnd).toHaveBeenCalled()
  })

  it('A12: deleteSessions by ids merges stop and dispose', async () => {
    const done = ctrl.deleteSessions({
      sessionIds: ['s-life'],
      source: ['ai'],
    })
    expect(ipcRendererMock.invoke).toHaveBeenCalledWith('cancel-ai-re-act', 's-life')
    // dispose 等 session-end / 5s 兜底后再卸池
    await vi.advanceTimersByTimeAsync(5000)
    await done
    expect(ctrl.isSessionReady('s-life')).toBe(false)
  })

  it('A24: deleteSessions orphan path deletes IDB without cancel', async () => {
    vi.useRealTimers()
    const aiChatPersistStore = (await import('../persist/aiChatPersistStore')).default
    const { drainSessionContentWrites } = await import('../persist/contentPersistHelper')
    ;(drainSessionContentWrites as any).mockResolvedValue([])
    ;(aiChatPersistStore.deleteSessionPersist as any).mockResolvedValue(undefined)

    await ctrl.deleteSessions({
      sessionIds: ['orphan-only'],
      source: ['ai'],
    })
    expect(ipcRendererMock.invoke).not.toHaveBeenCalledWith('cancel-ai-re-act', 'orphan-only')
    expect(aiChatPersistStore.deleteSessionPersist).toHaveBeenCalledWith('orphan-only')
    expect(aiChatPersistStore.deletePersistBySource).not.toHaveBeenCalled()
  })

  it('A25: deleteSessions by source clears all pages then persistBySource', async () => {
    const aiChatPersistStore = (await import('../persist/aiChatPersistStore')).default
    ctrl.handleStartSession(startParams('s-bulk-a', 'page-a'))
    await ctrl.ensureSession('s-bulk-a').meta.lifecycle.preparation
    ctrl.handleStartSession(startParams('s-bulk-b', 'page-b'))
    await ctrl.ensureSession('s-bulk-b').meta.lifecycle.preparation

    const done = ctrl.deleteSessions({
      sessionIds: [],
      source: ['ai'],
    })

    expect(ipcRendererMock.invoke).toHaveBeenCalledWith('cancel-ai-re-act', 's-bulk-a')
    expect(ipcRendererMock.invoke).toHaveBeenCalledWith('cancel-ai-re-act', 's-bulk-b')
    await vi.advanceTimersByTimeAsync(5000)
    await done
    expect(aiChatPersistStore.deletePersistBySource).toHaveBeenCalledWith('ai')
    expect(ctrl.isSessionReady('s-bulk-a')).toBe(false)
    expect(ctrl.isSessionReady('s-bulk-b')).toBe(false)
  })

  it('A26: deleteAll clears all sources via deleteAllPersist', async () => {
    const aiChatPersistStore = (await import('../persist/aiChatPersistStore')).default
    ctrl.handleStartSession(startParams('s-all-a', 'page-a'))
    await ctrl.ensureSession('s-all-a').meta.lifecycle.preparation
    ctrl.handleStartSession({
      ...startParams('s-all-im', 'page-b'),
      params: { Params: { Source: 'im', UserQuery: '' } } as any,
    })

    const done = ctrl.deleteSessions({ deleteAll: true })
    await vi.advanceTimersByTimeAsync(5000)
    await done

    expect(ctrl.isSessionReady('s-all-a')).toBe(false)
    expect(ctrl.isSessionReady('s-all-im')).toBe(false)
    expect(aiChatPersistStore.deleteAllPersist).toHaveBeenCalled()
    expect(aiChatPersistStore.deletePersistBySource).not.toHaveBeenCalled()
  })

  it('A27: empty sessionIds without source or deleteAll is no-op', async () => {
    const aiChatPersistStore = (await import('../persist/aiChatPersistStore')).default
    await ctrl.deleteSessions({ sessionIds: [] })
    expect(ipcRendererMock.invoke).not.toHaveBeenCalledWith('cancel-ai-re-act', 's-life')
    expect(aiChatPersistStore.deletePersistBySource).not.toHaveBeenCalled()
    expect(aiChatPersistStore.deleteAllPersist).not.toHaveBeenCalled()
    expect(ctrl.isSessionReady('s-life')).toBe(true)
  })
})

describe('ChatMultiSessionController start / send / history', async () => {
  let ctrl: ChatMultiSessionController

  beforeEach(async () => {
    resetIpcMocks()
    ctrl = new ChatMultiSessionController()
  })

  it('A13: duplicate start returns false', async () => {
    expect(ctrl.handleStartSession(startParams('s-dup'))).toBe(true)
    await ctrl.ensureSession('s-dup').meta.lifecycle.preparation
    expect(ctrl.handleStartSession(startParams('s-dup'))).toBe(false)
    await ctrl.ensureSession('s-dup').meta.lifecycle.preparation
  })

  it('A14: no UserQuery enters restore loading', async () => {
    ctrl.handleStartSession(startParams('s-restore', 'page-1', ''))
    await ctrl.ensureSession('s-restore').meta.lifecycle.preparation
    expect(ctrl.ensureSession('s-restore').store.getState().initLoading).toBe(true)
  })

  it('A14c: restore finish (grpcOffset=0) clears initLoading and loadingHistory casualTitle', async () => {
    ctrl.handleStartSession(startParams('s-restore-clear', 'page-1', ''))
    await ctrl.ensureSession('s-restore-clear').meta.lifecycle.preparation
    const { store } = ctrl.ensureSession('s-restore-clear')
    expect(store.getState().initLoading).toBe(true)
    // 建连时写入「获取历史数据中...」占位文案
    expect(store.getState().currentLoadingTitle.casualTitle).not.toBe('')

    await ctrl.handleGrpcOutputEvent('s-restore-clear', makeGrpcJsonRes('pong', {}))
    await finishRecovery(ctrl, 's-restore-clear')
    await vi.waitFor(() => {
      expect(store.getState().initLoading).toBe(false)
    })
    // 恢复完成后兜底清空，否则 Footer 一直显示「获取历史数据中...」
    expect(store.getState().currentLoadingTitle.casualTitle).toBe('')
    await ctrl.handleSessionEnd('s-restore-clear')
  })

  it('A14d: restore via recovery_history clears casualTitle; running-task title preserved', async () => {
    const { grpcQueryAIEvent } = await import('@/pages/ai-agent/grpc')
    // 有历史事件：grpcOffset>0，走 recovery_history 分支
    ;(grpcQueryAIEvent as any).mockResolvedValue({ Events: [{ ID: 7 }], Total: 1 })

    ctrl.handleStartSession(startParams('s-recovery', 'page-1', ''))
    await ctrl.ensureSession('s-recovery').meta.lifecycle.preparation
    await vi.waitFor(() => {
      expect(ipcRendererMock.invoke).toHaveBeenCalledWith('start-ai-re-act', 's-recovery', expect.anything())
    })
    await ctrl.handleGrpcOutputEvent('s-recovery', makeGrpcJsonRes('pong', {}))
    await vi.waitFor(() => {
      expect(ipcRendererMock.invoke).toHaveBeenCalledWith(
        'send-ai-re-act',
        's-recovery',
        expect.objectContaining({ IsSyncMessage: true, SyncType: 'recovery_history' }),
      )
    })
    await ctrl.handleGrpcOutputEvent(
      's-recovery',
      makeGrpcJsonRes('structured', { next_start_id: 3, events: [] }, { NodeId: 'recovery_history' }),
    )
    const { store } = ctrl.ensureSession('s-recovery')
    await vi.waitFor(() => {
      expect(store.getState().initLoading).toBe(false)
    })
    expect(store.getState().currentLoadingTitle.casualTitle).toBe('')

    // 问题仍在执行（queue_info 已回填运行态文案）时不清空，避免覆盖
    ctrl.handleStartSession(startParams('s-recovery-run', 'page-2', ''))
    await ctrl.ensureSession('s-recovery-run').meta.lifecycle.preparation
    await vi.waitFor(() => {
      expect(ipcRendererMock.invoke).toHaveBeenCalledWith('start-ai-re-act', 's-recovery-run', expect.anything())
    })
    const runningStore = ctrl.ensureSession('s-recovery-run').store
    runningStore.getState().updateState({
      currentChatStatus: { questionID: 'q1', coordinatorId: '', status: AITaskStatus.inProgress },
      currentLoadingTitle: { casualTitle: 'question-running', planTitle: '' },
    })
    await ctrl.handleGrpcOutputEvent('s-recovery-run', makeGrpcJsonRes('pong', {}))
    await vi.waitFor(() => {
      expect(ipcRendererMock.invoke).toHaveBeenCalledWith(
        'send-ai-re-act',
        's-recovery-run',
        expect.objectContaining({ IsSyncMessage: true, SyncType: 'recovery_history' }),
      )
    })
    await ctrl.handleGrpcOutputEvent(
      's-recovery-run',
      makeGrpcJsonRes('structured', { next_start_id: 5, events: [] }, { NodeId: 'recovery_history' }),
    )
    await vi.waitFor(() => {
      expect(runningStore.getState().initLoading).toBe(false)
    })
    expect(runningStore.getState().currentLoadingTitle.casualTitle).toBe('question-running')
    ;(grpcQueryAIEvent as any).mockResolvedValue({ Events: [] })
    await ctrl.handleSessionEnd('s-recovery')
    await ctrl.handleSessionEnd('s-recovery-run')
  })

  it('A23: onLinkStart after ensureSession; onLinkSuccess after first history', async () => {
    const onLinkStart = vi.fn()
    const onLinkSuccess = vi.fn()
    expect(ctrl.handleStartSession(startParams('s-cb'), { onLinkStart, onLinkSuccess })).toBe(true)
    await ctrl.ensureSession('s-cb').meta.lifecycle.preparation
    expect(onLinkStart).toHaveBeenCalledWith('s-cb')
    expect(ctrl.ensureSession('s-cb').store).toBeTruthy()
    expect(onLinkSuccess).not.toHaveBeenCalled()

    await ctrl.handleGrpcOutputEvent('s-cb', makeGrpcJsonRes('pong', {}))
    await finishRecovery(ctrl, 's-cb')
    await vi.waitFor(() => {
      expect(onLinkSuccess).toHaveBeenCalledWith('s-cb')
    })
  })

  it('A24: skip subtask send records id; grpc event clears it', async () => {
    ctrl.handleStartSession(startParams('s-skip'))
    await ctrl.ensureSession('s-skip').meta.lifecycle.preparation
    await finishRecovery(ctrl, 's-skip')
    const skipParams = {
      IsSyncMessage: true,
      SyncType: AIInputEventSyncTypeEnum.SYNC_TYPE_SKIP_SUBTASK_IN_PLAN,
      SyncJsonInput: JSON.stringify({ reason: '用户认为这个任务不需要执行', subtask_id: 'sub-1' }),
      SyncID: 'sync-skip-1',
    }

    ctrl.handleSendMessage({ token: 's-skip', type: 'task', params: skipParams as any })
    expect(ctrl.ensureSession('s-skip').store.getState().skipSubtaskTaskIDs).toEqual(['sub-1'])

    ctrl.handleSendMessage({ token: 's-skip', type: 'task', params: skipParams as any })
    expect(ctrl.ensureSession('s-skip').store.getState().skipSubtaskTaskIDs).toEqual(['sub-1'])

    await ctrl.handleGrpcOutputEvent(
      's-skip',
      makeGrpcJsonRes(
        'structured',
        {
          message: 'ok',
          reason: '用户认为这个任务不需要执行',
          subtask_id: 'sub-1',
          subtask_index: '0',
          subtask_name: 'leaf',
          success: true,
        },
        { NodeId: 'skip_subtask_in_plan' },
      ),
    )
    expect(ctrl.ensureSession('s-skip').store.getState().skipSubtaskTaskIDs).toEqual([])
  })

  it('A28: cancel task send records task_id; event clears it', async () => {
    ctrl.handleStartSession(startParams('s-cancel'))
    await ctrl.ensureSession('s-cancel').meta.lifecycle.preparation
    await finishRecovery(ctrl, 's-cancel')
    const cancelParams = {
      IsSyncMessage: true,
      SyncType: AIInputEventSyncTypeEnum.SYNC_TYPE_REACT_CANCEL_TASK,
      SyncJsonInput: JSON.stringify({ task_id: 'react-1' }),
    }

    ctrl.handleSendMessage({ token: 's-cancel', type: 'task', params: cancelParams as any })
    expect(ctrl.ensureSession('s-cancel').store.getState().skipSubtaskTaskIDs).toEqual(['react-1'])

    ctrl.handleSendMessage({ token: 's-cancel', type: 'task', params: cancelParams as any })
    expect(ctrl.ensureSession('s-cancel').store.getState().skipSubtaskTaskIDs).toEqual(['react-1'])

    await ctrl.handleGrpcOutputEvent(
      's-cancel',
      makeGrpcJsonRes(
        'structured',
        {
          message: 'ok',
          reason: '',
          subtask_id: 'react-1',
          subtask_index: '0',
          subtask_name: '',
          success: true,
        },
        { NodeId: 'skip_subtask_in_plan' },
      ),
    )
    expect(ctrl.ensureSession('s-cancel').store.getState().skipSubtaskTaskIDs).toEqual([])
  })

  it('A29: skip/cancel payload without id is not recorded', async () => {
    ctrl.handleStartSession(startParams('s-noop'))
    await ctrl.ensureSession('s-noop').meta.lifecycle.preparation
    await finishRecovery(ctrl, 's-noop')
    ctrl.handleSendMessage({
      token: 's-noop',
      type: 'task',
      params: {
        IsSyncMessage: true,
        SyncType: AIInputEventSyncTypeEnum.SYNC_TYPE_REACT_CANCEL_TASK,
        SyncJsonInput: JSON.stringify({}),
      } as any,
    })
    ctrl.handleSendMessage({
      token: 's-noop',
      type: 'task',
      params: {
        IsSyncMessage: true,
        SyncType: AIInputEventSyncTypeEnum.SYNC_TYPE_SKIP_SUBTASK_IN_PLAN,
        SyncJsonInput: JSON.stringify({ reason: '用户认为这个任务不需要执行' }),
      } as any,
    })
    expect(ctrl.ensureSession('s-noop').store.getState().skipSubtaskTaskIDs).toEqual([])
  })
  it('A14b: requests the runtime queue snapshot after first history', async () => {
    ctrl.handleStartSession(startParams('s-runtime-snapshot', 'page-1', ''))
    await ctrl.ensureSession('s-runtime-snapshot').meta.lifecycle.preparation

    await ctrl.handleGrpcOutputEvent('s-runtime-snapshot', makeGrpcJsonRes('pong', {}))
    await finishRecovery(ctrl, 's-runtime-snapshot')

    await vi.waitFor(() => {
      expect(ipcRendererMock.invoke).toHaveBeenCalledWith(
        'send-ai-re-act',
        's-runtime-snapshot',
        expect.objectContaining({
          IsSyncMessage: true,
          SyncType: 'queue_info',
        }),
      )
    })
    await ctrl.handleSessionEnd('s-runtime-snapshot')
  })

  it.each(['', '新会话问题'])('首批历史完成后同步一次会话快照（UserQuery=%j）', async (userQuery) => {
    const sessionId = 's-session-snapshot'
    const snapshotCalls = () =>
      ipcRendererMock.invoke.mock.calls.filter(
        ([channel, token, params]) =>
          channel === 'send-ai-re-act' && token === sessionId && params?.SyncType === 'session_snapshot_sync',
      )

    try {
      ctrl.handleStartSession(startParams(sessionId, 'page-1', userQuery))
      await ctrl.ensureSession(sessionId).meta.lifecycle.preparation
      await Promise.resolve()
      expect(snapshotCalls()).toHaveLength(0)

      await ctrl.handleGrpcOutputEvent(sessionId, makeGrpcJsonRes('pong', {}, { SyncID: 'expired-ping' }))
      await Promise.resolve()
      expect(snapshotCalls()).toHaveLength(0)

      const { meta } = ctrl.ensureSession(sessionId)
      await ctrl.handleGrpcOutputEvent(sessionId, makeGrpcJsonRes('pong', {}, { SyncID: meta.pingSyncID }))
      expect(snapshotCalls()).toHaveLength(0)
      await finishRecovery(ctrl, sessionId)

      await vi.waitFor(() => {
        expect(snapshotCalls()).toEqual([
          ['send-ai-re-act', sessionId, { IsSyncMessage: true, SyncType: 'session_snapshot_sync' }],
        ])
      })
    } finally {
      await ctrl.handleSessionEnd(sessionId)
    }
  })

  it('A17: send without ready warns when active', async () => {
    ctrl.setActiveShowSession('ghost')
    expect(() =>
      ctrl.handleSendMessage({
        token: 'ghost',
        type: 'casual',
        params: { IsFreeInput: true, FreeInput: 'hi' } as any,
      }),
    ).not.toThrow()
  })

  it('A19: requestRecoveryHistory invokes send', async () => {
    ctrl.handleStartSession(startParams('s-hist'))
    await ctrl.ensureSession('s-hist').meta.lifecycle.preparation
    ctrl.requestRecoveryHistory('s-hist')
    expect(ipcRendererMock.invoke).toHaveBeenCalledWith(
      'send-ai-re-act',
      's-hist',
      expect.objectContaining({ IsSyncMessage: true }),
    )
  })

  it('A20: loadTimelineHistory toggles timelinesLoading', async () => {
    ctrl.handleStartSession(startParams('s-tl'))
    await ctrl.ensureSession('s-tl').meta.lifecycle.preparation
    const { store } = ctrl.ensureSession('s-tl')
    expect(store.getState().timelinesLoading).toBe(false)

    const { grpcQueryAIEvent } = await import('@/pages/ai-agent/grpc')
    let resolveQuery: (value: { Events: unknown[]; Total: number }) => void = () => undefined
    ;(grpcQueryAIEvent as any).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveQuery = resolve
        }),
    )

    const pending = ctrl.loadTimelineHistory('s-tl')
    expect(store.getState().timelinesLoading).toBe(true)
    resolveQuery({ Events: [], Total: 0 })
    await expect(pending).resolves.toBe(false)
    expect(store.getState().timelinesLoading).toBe(false)
    expect(ctrl.hasMoreTimeline('s-tl')).toBe(false)
  })

  it('A21: loadFileSystemHistory callable', async () => {
    ctrl.handleStartSession(startParams('s-fs'))
    await ctrl.ensureSession('s-fs').meta.lifecycle.preparation
    const { grpcQueryAIEvent } = await import('@/pages/ai-agent/grpc')
    ;(grpcQueryAIEvent as any).mockResolvedValue({ Events: [] })
    await expect(ctrl.loadFileSystemHistory('s-fs')).resolves.toBeUndefined()
  })

  it('A22: task plan-review continue updates currentPlan and clears extra', async () => {
    ctrl.handleStartSession(startParams('s-plan-cont'))
    await ctrl.ensureSession('s-plan-cont').meta.lifecycle.preparation
    await finishRecovery(ctrl, 's-plan-cont')
    const session = ctrl.ensureSession('s-plan-cont')
    session.rawData.contents.set('plan-rev-1', {
      id: 'plan-rev-1',
      type: 'plan_review_require',
      chatType: 'task',
      data: {
        plans: {
          root_task: {
            task_id: 'root',
            name: 'root-name',
            goal: '',
            semantic_identifier: 'root',
            depends_on: [],
            subtasks: [
              {
                task_id: 'leaf-1',
                name: 'leaf',
                goal: '',
                semantic_identifier: 'leaf',
                depends_on: [],
                subtasks: [],
              },
            ],
          },
        },
      },
    } as any)
    session.store.getState().updateState({ currentReviewDetail: { token: 'plan-rev-1', renderNum: 0 } })
    session.meta.currentPlanReviewExtraId = 'extra-1'
    session.meta.planReviewExtraData.set('extra-1', { id: 'extra-1' } as any)

    ctrl.handleSendMessage({
      token: 's-plan-cont',
      type: 'task',
      optionValue: 'continue',
      params: {
        IsInteractiveMessage: true,
        InteractiveId: 'plan-rev-1',
        InteractiveJSONInput: JSON.stringify({ suggestion: 'continue' }),
      } as any,
    })

    expect(session.store.getState().currentPlan.root_task_name).toBe('root-name')
    expect(session.store.getState().currentPlan.task_tree.some((t) => t.task_id === 'leaf-1')).toBe(true)
    expect(session.meta.currentPlanReviewExtraId).toBe('')
    expect(session.meta.planReviewExtraData.size).toBe(0)
    expect(session.rawData.contents.get('plan-rev-1')).toBeUndefined()
    expect(session.store.getState().currentReviewDetail.token).toBe('')
  })

  it('A23: task plan-review non-continue skips currentPlan but still clears extra', async () => {
    ctrl.handleStartSession(startParams('s-plan-chg'))
    await ctrl.ensureSession('s-plan-chg').meta.lifecycle.preparation
    await finishRecovery(ctrl, 's-plan-chg')
    const session = ctrl.ensureSession('s-plan-chg')
    session.rawData.contents.set('plan-rev-2', {
      id: 'plan-rev-2',
      type: 'plan_review_require',
      chatType: 'task',
      data: {
        plans: {
          root_task: {
            task_id: 'root',
            name: 'root-name',
            goal: '',
            semantic_identifier: 'root',
            depends_on: [],
            subtasks: [],
          },
        },
      },
    } as any)
    session.store.getState().updateState({ currentReviewDetail: { token: 'plan-rev-2', renderNum: 0 } })
    session.meta.currentPlanReviewExtraId = 'extra-2'
    session.meta.planReviewExtraData.set('extra-2', { id: 'extra-2' } as any)

    ctrl.handleSendMessage({
      token: 's-plan-chg',
      type: 'task',
      optionValue: 'change',
      params: {
        IsInteractiveMessage: true,
        InteractiveId: 'plan-rev-2',
        InteractiveJSONInput: JSON.stringify({ suggestion: 'change' }),
      } as any,
    })

    expect(session.store.getState().currentPlan).toEqual(DefaultCurrentExecTaskTree)
    expect(session.meta.currentPlanReviewExtraId).toBe('')
    expect(session.meta.planReviewExtraData.size).toBe(0)
    expect(session.rawData.contents.get('plan-rev-2')).toBeUndefined()
    expect(session.store.getState().currentReviewDetail.token).toBe('')
  })
})

describe('ChatMultiSessionController restore / renderPersist / collect', async () => {
  let ctrl: ChatMultiSessionController

  beforeEach(async () => {
    resetIpcMocks()
    vi.useFakeTimers()
    ctrl = new ChatMultiSessionController()
    ctrl.handleStartSession(startParams('s-rp'))
    await ctrl.ensureSession('s-rp').meta.lifecycle.preparation
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('A15/A18: hydrate via ensureSession + structural dirty deferred', async () => {
    const { store } = ctrl.ensureSession('s-rp')
    store.getState().hydrateRenderTree({
      items: { a: { kind: 'item', token: 'a', type: 'thought', renderNum: 0, nodeId: '' } as any },
      groups: {},
      tasks: {},
      chatElements: [{ kind: 'item', token: 'a', chatType: 'reAct', isHistory: false }],
    })
    expect(store.getState().items.a).toBeTruthy()
  })

  it('A16: structure change schedules persist flush debounce', async () => {
    const aiChatPersistStore = (await import('../persist/aiChatPersistStore')).default
    const { store } = ctrl.ensureSession('s-rp')
    store.getState().dispatchStreamingNode({
      chatType: 'reAct',
      node: { token: 'n1', kind: 'item', type: 'thought' },
    })
    vi.advanceTimersByTime(3000)
    await Promise.resolve()
    expect(aiChatPersistStore.setSessionRender).toHaveBeenCalled()
  })

  it('A10b: session end with processing currentChatStatus', async () => {
    const { store } = ctrl.ensureSession('s-rp')
    store.getState().updateState({
      currentChatStatus: {
        questionID: 't1',
        status: AITaskStatus.inProgress,
        coordinatorId: 'c1',
      },
    })
    await ctrl.handleSessionEnd('s-rp')
    expect(store.getState().execute).toBe(false)
    expect(store.getState().currentChatStatus.status).toBe(AITaskStatus.error)
  })
})

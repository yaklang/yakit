import './setupElectron'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ChatMultiSessionController } from '../ChatMultiSessionController'
import { YakitRoute } from '@/enums/yakitRoute'
import { ipcRendererMock, resetIpcMocks } from './setupElectron'
import { AITaskStatus } from '../grpcApi'
import { makeGrpcJsonRes } from './fixtures'

vi.mock('@/utils/notification', () => ({ yakitNotify: vi.fn() }))
vi.mock('@/pages/ai-agent/grpc', () => ({
  grpcQueryAIEvent: vi.fn().mockResolvedValue({ Events: [] }),
}))
vi.mock('../persist/contentPersistHelper', () => ({
  persistIndependentItem: vi.fn(),
  persistToolResultIfTerminal: vi.fn(),
  drainSessionContentWrites: vi.fn().mockResolvedValue([]),
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

describe('ChatMultiSessionController page index / ensureSession', () => {
  let ctrl: ChatMultiSessionController

  beforeEach(() => {
    resetIpcMocks()
    vi.clearAllMocks()
    ctrl = new ChatMultiSessionController()
  })

  it('A2/A3: ensureSession idempotent and active show', () => {
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

  it('A5/A6: updateSessionConfig ignores Source; removeContentsFromMemory is callable', () => {
    const { request, rawData } = ctrl.ensureSession('s-cfg')
    request.Source = 'ai'
    ctrl.updateSessionConfig('s-cfg', { ReviewPolicy: 'yolo', Source: 'im' } as any)
    expect(request.ReviewPolicy).toBe('yolo')
    expect(request.Source).toBe('ai')

    rawData.contents.set('t1', { id: 't1' } as any)
    // 当前实现体已注释，调用应不抛；恢复删除逻辑后再断言 has===false
    expect(() => ctrl.removeContentsFromMemory('s-cfg', ['t1'])).not.toThrow()
  })

  it('A22: getSessionExecute is read-only and does not create empty pool', () => {
    expect(ctrl.getSessionExecute('ghost')).toBe(false)
    // 只读查询不得 ensureSession 造池：再 ensure 才应新建
    expect(ctrl.filterExecutingSessionIds(['ghost'])).toEqual([])

    ctrl.handleStartSession(startParams('s-exec'))
    const { store } = ctrl.ensureSession('s-exec')
    store.getState().updateState({ execute: true })
    expect(ctrl.getSessionExecute('s-exec')).toBe(true)
    expect(ctrl.filterExecutingSessionIds(['s-exec', 'ghost'])).toEqual(['s-exec'])

    store.getState().updateState({ execute: false })
    expect(ctrl.getSessionExecute('s-exec')).toBe(false)
  })

  it('A23: getSessionIdsBySourceAndRoute crosses pageIds', () => {
    ctrl.handleStartSession(startParams('s-a', 'page-a'))
    ctrl.handleStartSession(startParams('s-b', 'page-b'))
    ctrl.handleStartSession({
      ...startParams('s-im', 'page-a'),
      params: { Params: { Source: 'im', UserQuery: '' } } as any,
    })

    const aiIds = ctrl.getSessionIdsBySourceAndRoute('ai', YakitRoute.AI_Agent).sort()
    expect(aiIds).toEqual(['s-a', 's-b'])
    expect(ctrl.getSessionIdsBySourceAndRoute('im', YakitRoute.AI_Agent)).toEqual(['s-im'])
  })
})

describe('ChatMultiSessionController session api / dispatch', () => {
  let ctrl: ChatMultiSessionController

  beforeEach(() => {
    resetIpcMocks()
    ctrl = new ChatMultiSessionController()
    ctrl.handleStartSession(startParams('s-api'))
  })

  it('A7: persist helpers callable', async () => {
    await expect(ctrl.persistGetSessionContents('s-api', ['a'])).resolves.toBeDefined()
    await expect(ctrl.getSessionReferenceMaterials('s-api', ['a'])).resolves.toBeDefined()
    await expect(ctrl.persistDeleteBySource('ai')).resolves.toBeUndefined()
  })

  it('A8: handleGrpcOutputEvent unknown type no throw', () => {
    expect(() => ctrl.handleGrpcOutputEvent('s-api', makeGrpcJsonRes('unknown_type_xyz', { a: 1 }))).not.toThrow()
  })

  it('A8: session_title via structured NodeId', () => {
    ctrl.handleGrpcOutputEvent('s-api', makeGrpcJsonRes('structured', { title: 'T' }, { NodeId: 'session_title' }))
    expect(ctrl.ensureSession('s-api').rawData.sessionTitle).toBe('T')
  })

  it('A9: pushDataToSession / closeChatReview / updateToolResult', () => {
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

describe('ChatMultiSessionController lifecycle', () => {
  let ctrl: ChatMultiSessionController

  beforeEach(() => {
    resetIpcMocks()
    vi.clearAllMocks()
    vi.useFakeTimers()
    ctrl = new ChatMultiSessionController()
    ctrl.handleStartSession(startParams('s-life'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('A10: handleSessionEnd stops execute', () => {
    const { store } = ctrl.ensureSession('s-life')
    store.getState().updateState({ execute: true })
    ctrl.handleSessionEnd('s-life')
    expect(store.getState().execute).toBe(false)
    expect(store.getState().currentLoadingTitle.casualTitle).toBe('会话已关闭')
    expect(store.getState().currentChatStatus.status).toBe(AITaskStatus.error)
    expect(ctrl.isSessionReady('s-life')).toBe(false)
  })

  it('A11: forceClose arms fallback end', () => {
    const onEnd = vi.fn()
    ctrl.forceCloseSession({ sessionIds: ['s-life'], onEnd })
    expect(ipcRendererMock.invoke).toHaveBeenCalledWith('cancel-ai-re-act', 's-life')
    vi.advanceTimersByTime(5000)
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
    ctrl.handleStartSession(startParams('s-bulk-b', 'page-b'))

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

describe('ChatMultiSessionController start / send / history', () => {
  let ctrl: ChatMultiSessionController

  beforeEach(() => {
    resetIpcMocks()
    ctrl = new ChatMultiSessionController()
  })

  it('A13: duplicate start returns false', () => {
    expect(ctrl.handleStartSession(startParams('s-dup'))).toBe(true)
    expect(ctrl.handleStartSession(startParams('s-dup'))).toBe(false)
  })

  it('A14: no UserQuery enters restore loading', () => {
    ctrl.handleStartSession(startParams('s-restore', 'page-1', ''))
    expect(ctrl.ensureSession('s-restore').store.getState().initLoading).toBe(true)
  })

  it('A17: send without ready warns when active', () => {
    ctrl.setActiveShowSession('ghost')
    expect(() =>
      ctrl.handleSendMessage({
        token: 'ghost',
        type: 'casual',
        params: { IsFreeInput: true, FreeInput: 'hi' } as any,
      }),
    ).not.toThrow()
  })

  it('A19: requestRecoveryHistory invokes send', () => {
    ctrl.handleStartSession(startParams('s-hist'))
    ctrl.requestRecoveryHistory('s-hist')
    expect(ipcRendererMock.invoke).toHaveBeenCalledWith(
      'send-ai-re-act',
      's-hist',
      expect.objectContaining({ IsSyncMessage: true }),
    )
  })

  it('A20: loadTimelineHistory toggles timelinesLoading', async () => {
    ctrl.handleStartSession(startParams('s-tl'))
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
    const { grpcQueryAIEvent } = await import('@/pages/ai-agent/grpc')
    ;(grpcQueryAIEvent as any).mockResolvedValue({ Events: [] })
    await expect(ctrl.loadFileSystemHistory('s-fs')).resolves.toBeUndefined()
  })
})

describe('ChatMultiSessionController restore / renderPersist / collect', () => {
  let ctrl: ChatMultiSessionController

  beforeEach(() => {
    resetIpcMocks()
    vi.useFakeTimers()
    ctrl = new ChatMultiSessionController()
    ctrl.handleStartSession(startParams('s-rp'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('A15/A18: hydrate via ensureSession + structural dirty deferred', () => {
    const { store } = ctrl.ensureSession('s-rp')
    store.getState().hydrateRenderTree({
      items: { a: { kind: 'item', token: 'a', type: 'thought', renderNum: 0, nodeId: '' } as any },
      groups: {},
      tasks: {},
      casualElements: [{ kind: 'item', token: 'a', chatType: 'reAct', isHistory: false }],
      taskElements: [],
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

  it('A10b: session end with processing currentChatStatus', () => {
    const { store } = ctrl.ensureSession('s-rp')
    store.getState().updateState({
      currentChatStatus: {
        questionID: 't1',
        status: AITaskStatus.inProgress,
        coordinatorId: 'c1',
      },
    })
    ctrl.handleSessionEnd('s-rp')
    expect(store.getState().execute).toBe(false)
    expect(store.getState().currentChatStatus.status).toBe(AITaskStatus.error)
  })
})

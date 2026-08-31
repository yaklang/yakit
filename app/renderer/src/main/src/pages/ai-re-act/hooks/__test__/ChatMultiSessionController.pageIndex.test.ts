import './setupElectron'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ChatMultiSessionController } from '../ChatMultiSessionController'
import { YakitRoute } from '@/enums/yakitRoute'
import { ipcRendererMock, resetIpcMocks } from './setupElectron'
import { AIInputEventSyncTypeEnum, AITaskStatus } from '../grpcApi'
import { DefaultCurrentExecTaskTree } from '../defaultConstant'
import { makeGrpcJsonRes } from './fixtures'

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
    // i18n stub 的 t 直接返回 key 本身
    expect(store.getState().currentLoadingTitle.casualTitle).toBe('AIChatLoading.sessionClosed')
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

  it('A23: onLinkStart after ensureSession; onLinkSuccess after pong', async () => {
    const onLinkStart = vi.fn()
    const onLinkSuccess = vi.fn()
    expect(ctrl.handleStartSession(startParams('s-cb'), { onLinkStart, onLinkSuccess })).toBe(true)
    expect(onLinkStart).toHaveBeenCalledWith('s-cb')
    expect(ctrl.ensureSession('s-cb').store).toBeTruthy()
    expect(onLinkSuccess).not.toHaveBeenCalled()

    ctrl.handleGrpcOutputEvent('s-cb', makeGrpcJsonRes('pong', {}))
    await vi.waitFor(() => {
      expect(onLinkSuccess).toHaveBeenCalledWith('s-cb')
    })
  })

  it('A24: skip subtask send records id; grpc event clears it', () => {
    ctrl.handleStartSession(startParams('s-skip'))
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

    ctrl.handleGrpcOutputEvent(
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

  it('A28: cancel task send records task_id; event clears it', () => {
    ctrl.handleStartSession(startParams('s-cancel'))
    const cancelParams = {
      IsSyncMessage: true,
      SyncType: AIInputEventSyncTypeEnum.SYNC_TYPE_REACT_CANCEL_TASK,
      SyncJsonInput: JSON.stringify({ task_id: 'react-1' }),
    }

    ctrl.handleSendMessage({ token: 's-cancel', type: 'task', params: cancelParams as any })
    expect(ctrl.ensureSession('s-cancel').store.getState().skipSubtaskTaskIDs).toEqual(['react-1'])

    ctrl.handleSendMessage({ token: 's-cancel', type: 'task', params: cancelParams as any })
    expect(ctrl.ensureSession('s-cancel').store.getState().skipSubtaskTaskIDs).toEqual(['react-1'])

    ctrl.handleGrpcOutputEvent(
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

  it('A29: skip/cancel payload without id is not recorded', () => {
    ctrl.handleStartSession(startParams('s-noop'))
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
  it('A14b: requests the runtime queue snapshot after pong', async () => {
    ctrl.handleStartSession(startParams('s-runtime-snapshot', 'page-1', ''))

    ctrl.handleGrpcOutputEvent('s-runtime-snapshot', makeGrpcJsonRes('pong', {}))

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
    ctrl.handleSessionEnd('s-runtime-snapshot')
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

  it('A22: task plan-review continue updates currentPlan and clears extra', () => {
    ctrl.handleStartSession(startParams('s-plan-cont'))
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

  it('A23: task plan-review non-continue skips currentPlan but still clears extra', () => {
    ctrl.handleStartSession(startParams('s-plan-chg'))
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

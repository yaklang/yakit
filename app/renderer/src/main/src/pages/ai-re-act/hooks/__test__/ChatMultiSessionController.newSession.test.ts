import './setupElectron'
import i18n from '@/i18n/i18n'

const tAgent = i18n.getFixedT(null, 'aiAgent')
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ChatMultiSessionController, type PendingAIChat } from '../ChatMultiSessionController'
import { YakitRoute } from '@/enums/yakitRoute'
import { ipcRendererMock, resetIpcMocks } from './setupElectron'
import { makeGrpcJsonRes } from './fixtures'
import aiChatPersistStore from '../persist/aiChatPersistStore'
import { grpcQueryAIEvent } from '@/pages/ai-agent/grpc'
import { yakitNotify } from '@/utils/notification'
import { AIChatQSDataTypeEnum } from '../aiRender'
import { AISourceEnum } from '../grpcApi'
import type { AIChatIPCStartParams } from '../type'
import { AttachedResourceKeyEnum, AttachedResourceTypeEnum } from '@/pages/ai-agent/defaultConstant'

vi.mock('@/utils/notification', () => ({ yakitNotify: vi.fn() }))
vi.mock('@/pages/ai-agent/grpc', () => ({ grpcQueryAIEvent: vi.fn().mockResolvedValue({ Events: [] }) }))
vi.mock('../AIAgentLogEmitter', () => ({ aiAgentLogEmitter: { dispatch: vi.fn() } }))
vi.mock('../persist/aiChatPersistStore', () => ({
  default: {
    deleteSessionPersist: vi.fn().mockResolvedValue(undefined),
    deletePersistBySource: vi.fn().mockResolvedValue(undefined),
    setSessionRender: vi.fn().mockResolvedValue(undefined),
    setSessionContent: vi.fn().mockResolvedValue(undefined),
    setSessionReference: vi.fn().mockResolvedValue(undefined),
  },
}))

const tick = async () => {
  for (let i = 0; i < 30; i++) await Promise.resolve()
}

describe('frontend allocated session identity', () => {
  let controller: ChatMultiSessionController
  let pendings: Map<string, PendingAIChat>
  const success = vi.fn()
  const start = async (question = 'first question', pageId = 'page', sessionId = 'client-session') => {
    const token = controller.handleStartSession(
      {
        kind: 'new',
        sessionId,
        route: YakitRoute.AI_Agent,
        pageId,
        params: { IsStart: true, Params: { Source: 'ai', UserQuery: question, TimelineSessionID: 'stale-setting' } },
      },
      {
        onLinkSuccess: success,
        onPendingChange: (pending) => pendings.set(pending.streamToken, pending),
      },
    ) as string
    await tick()
    return token
  }
  const emit = async (token: string, type: string, id?: string) => {
    const listener = ipcRendererMock.on.mock.calls.find(([name]) => name === `${token}-data`)![1]
    listener({}, makeGrpcJsonRes(type, {}, { SessionId: id }))
    await tick()
  }
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    resetIpcMocks()
    controller = new ChatMultiSessionController()
    pendings = new Map()
  })
  afterEach(async () => {
    for (const token of pendings.keys()) controller.cancelPendingConnection(token)
    await vi.advanceTimersByTimeAsync(5000)
    vi.useRealTimers()
  })

  it('shows the first question before handshake, binds the same store and persists only with the client ID', async () => {
    const token = await start()
    const pending = pendings.get(token)!
    const first = [...pending.data.rawData.contents.values()][0]
    expect(first).toMatchObject({ type: AIChatQSDataTypeEnum.QUESTION, data: 'first question' })
    expect(pending.data.store.getState().pendingReply).toBe(true)
    expect(aiChatPersistStore.setSessionContent).not.toHaveBeenCalled()
    const request = ipcRendererMock.invoke.mock.calls.find(([method]) => method === 'start-ai-re-act')![2]
    expect(request.Params.TimelineSessionID).toBe('client-session')
    expect(request.Params.PreferSessionCachedConfig).toBe(false)
    expect(request.Params.Attach).toBe(false)
    expect(ipcRendererMock.invoke.mock.calls.some(([, , request]) => request?.IsFreeInput)).toBe(false)
    await emit(token, 'pong', 'client-session')
    expect(controller.ensureSession('client-session').store).toBe(pending.data.store)
    expect(pending.data.store.getState().pendingReply).toBe(true)
    expect(success).toHaveBeenCalledExactlyOnceWith('client-session')
    expect(aiChatPersistStore.deleteSessionPersist).not.toHaveBeenCalled()
    expect(grpcQueryAIEvent).not.toHaveBeenCalled()
    expect(aiChatPersistStore.setSessionContent).toHaveBeenCalledWith('client-session', first.id, expect.any(Function))
    expect(aiChatPersistStore.setSessionRender).toHaveBeenCalledWith(
      'client-session',
      'ai',
      expect.objectContaining({ chatElements: expect.any(Array) }),
      0,
    )
    const writes = ipcRendererMock.invoke.mock.calls.filter(([method]) => method === 'send-ai-re-act')
    expect(writes.every(([, key]) => key === token)).toBe(true)
    expect(
      writes.some(([, , request]) => request.SyncType === 'recovery_history' || request.SyncType === 'plan_exec_tasks'),
    ).toBe(false)
    expect(writes.filter(([, , request]) => request.IsFreeInput)).toHaveLength(1)
    await emit(token, 'pong', 'client-session')
    expect(success).toHaveBeenCalledTimes(1)
    expect(ipcRendererMock.invoke.mock.calls.filter(([, , request]) => request?.IsFreeInput)).toHaveLength(1)
    await controller.handleSessionEnd('client-session')
    expect(pending.data.store.getState().pendingReply).toBe(false)
  })

  it('clears cached attachment settings for a new session without mutating retry parameters', async () => {
    const params: AIChatIPCStartParams['params'] = {
      IsStart: true,
      Params: {
        Source: 'ai',
        UserQuery: 'first question',
        TimelineSessionID: 'old-session',
        Attach: true,
        PreferSessionCachedConfig: true,
      },
    }
    const original = structuredClone(params)
    const token = controller.handleStartSession({
      kind: 'new',
      sessionId: 'client-session',
      route: YakitRoute.AI_Agent,
      pageId: 'page',
      params,
    }) as string
    await tick()
    expect(ipcRendererMock.invoke).toHaveBeenCalledWith('start-ai-re-act', token, {
      IsStart: true,
      Params: {
        Source: 'ai',
        UserQuery: 'first question',
        TimelineSessionID: 'client-session',
        Attach: false,
        PreferSessionCachedConfig: false,
      },
    })
    expect(params).toEqual(original)
    controller.cancelPendingConnection(token)
  })

  it.each(['end', 'cancel'] as const)('persists queued IPC messages before %s completes', async (action) => {
    const token = await start()
    await emit(token, 'pong', 'client-session')
    const { rawData, meta } = controller.ensureSession('client-session')
    const listener = ipcRendererMock.on.mock.calls.find(([name]) => name === `${token}-data`)![1]
    const end = ipcRendererMock.on.mock.calls.find(([name]) => name === `${token}-end`)![1]
    let release!: () => void
    meta.lifecycle.events = new Promise<void>((resolve) => {
      release = resolve
    })
    const thought = (text: string) =>
      makeGrpcJsonRes('thought', { thought: text }, { SessionId: 'client-session', CoordinatorId: 'casual' })
    listener({}, thought('received before closing'))
    if (action === 'cancel') controller.forceCloseSession({ sessionIds: ['client-session'] })
    else end({})
    // 即使已移除的监听被迟到回调触发，也不能接收关闭后才到达的新消息。
    listener({}, thought('received after closing'))
    if (action === 'cancel') end({})
    release()
    await meta.lifecycle.ending

    const thoughts = [...rawData.contents.values()].filter((item) => item.type === AIChatQSDataTypeEnum.THOUGHT)
    expect(thoughts).toHaveLength(1)
    expect(thoughts[0].data).toBe('received before closing')
    expect(aiChatPersistStore.setSessionContent).toHaveBeenCalledWith(
      'client-session',
      thoughts[0].id,
      expect.any(Function),
    )
    expect(aiChatPersistStore.setSessionRender).toHaveBeenLastCalledWith(
      'client-session',
      'ai',
      expect.objectContaining({
        chatElements: expect.arrayContaining([expect.objectContaining({ token: thoughts[0].id })]),
      }),
      0,
    )
    expect(controller.isSessionReady('client-session')).toBe(false)
  })

  it('drops an already queued handshake when the pending connection is cancelled', async () => {
    const token = await start()
    const { meta } = pendings.get(token)!.data
    let release!: () => void
    meta.lifecycle.events = new Promise<void>((resolve) => {
      release = resolve
    })
    const listener = ipcRendererMock.on.mock.calls.find(([name]) => name === `${token}-data`)![1]
    listener({}, makeGrpcJsonRes('pong', {}, { SessionId: 'cancelled-session' }))
    controller.cancelPendingConnection(token)
    release()
    await meta.lifecycle.events

    expect(success).not.toHaveBeenCalled()
    expect(controller.isSessionReady('cancelled-session')).toBe(false)
    expect(aiChatPersistStore.setSessionContent).not.toHaveBeenCalled()
    expect(aiChatPersistStore.setSessionRender).not.toHaveBeenCalled()
    expect(ipcRendererMock.invoke.mock.calls.some(([, , request]) => request?.IsFreeInput)).toBe(false)
  })

  it('publishes the session before replaying buffered events in order, then accepts live events', async () => {
    const observed: string[] = []
    let unsubscribe = () => {}
    success.mockImplementationOnce((sessionId) => {
      observed.push('bound')
      const { store, rawData } = controller.ensureSession(sessionId)
      unsubscribe = store.subscribe(() => {
        const title = rawData.sessionTitle
        if (title && observed[observed.length - 1] !== title) observed.push(title)
      })
    })
    const token = await start()
    const listener = ipcRendererMock.on.mock.calls.find(([name]) => name === `${token}-data`)![1]
    const emitTitle = async (title: string, id: number) => {
      listener(
        {},
        makeGrpcJsonRes(
          'structured',
          { title },
          {
            ID: id,
            NodeId: 'session_title',
            SessionId: 'client-session',
          },
        ),
      )
      await tick()
    }
    await emitTitle('first', 1)
    await emitTitle('second', 2)
    expect(pendings.get(token)!.data.rawData.sessionTitle).toBe('')
    expect(observed).toEqual([])
    await emit(token, 'pong', 'client-session')
    expect(observed).toEqual(['bound', 'first', 'second'])
    await emitTitle('live', 3)
    expect(observed).toEqual(['bound', 'first', 'second', 'live'])
    unsubscribe()
    await controller.handleSessionEnd('client-session')
  })

  it('accepts pong without a returned ID while keeping the client identity', async () => {
    const token = await start()
    await emit(token, 'pong')
    expect(success).toHaveBeenCalledExactlyOnceWith('client-session')
    expect(controller.isSessionReady('client-session')).toBe(true)
  })

  it.each(['default', 'different-session'])('rejects mismatched identity %s before sending', async (id) => {
    const token = await start()
    await emit(token, 'pong', id)
    expect(yakitNotify).toHaveBeenCalledWith('error', tAgent('ChatSessionNotify.sessionIdMismatch'))
    expect(pendings.get(token)?.status).toBe('failed')
    expect(success).not.toHaveBeenCalled()
    expect(aiChatPersistStore.setSessionContent).not.toHaveBeenCalled()
    expect(ipcRendererMock.invoke.mock.calls.some(([, , request]) => request?.IsFreeInput)).toBe(false)
  })

  it('keeps concurrent connections isolated and ignores late output after cancellation', async () => {
    const a = await start('a', 'a', 'ai-session-a')
    const b = await start('b', 'b', 'ai-session-b')
    expect(a).not.toBe(b)
    controller.cancelPendingConnection(a)
    await emit(a, 'pong', 'ai-session-a')
    await emit(b, 'pong', 'ai-session-b')
    expect(success).toHaveBeenCalledExactlyOnceWith('ai-session-b')
    controller.handleSendMessage({
      token: 'ai-session-b',
      type: 'casual',
      params: { IsFreeInput: true, FreeInput: 'next' },
    })
    expect(ipcRendererMock.invoke).toHaveBeenCalledWith(
      'send-ai-re-act',
      b,
      expect.objectContaining({ FreeInput: 'next' }),
    )
    await controller.handleSessionEnd('ai-session-b')
  })

  it('times out without misdiagnosing a silent engine as an old engine', async () => {
    const token = await start()
    await vi.advanceTimersByTimeAsync(30000)
    expect(yakitNotify).toHaveBeenCalledWith('error', tAgent('ChatSessionNotify.initTimeout'))
    expect(ipcRendererMock.invoke).toHaveBeenCalledWith('cancel-ai-re-act', token)
    expect(success).not.toHaveBeenCalled()
  })

  it('unloading a page cancels its unbound connection', async () => {
    const token = await start()
    controller.onPageUnload(YakitRoute.AI_Agent, 'page')
    await emit(token, 'pong', 'ai-session-late')
    expect(success).not.toHaveBeenCalled()
    expect(ipcRendererMock.invoke).toHaveBeenCalledWith('cancel-ai-re-act', token)
  })

  it('resumes with an explicit ID and a fresh transport token', async () => {
    const token = controller.handleStartSession({
      kind: 'resume',
      sessionId: 'existing',
      route: YakitRoute.AI_Agent,
      pageId: 'page',
      params: { IsStart: true, Params: {} },
    }) as string
    await controller.ensureSession('existing').meta.lifecycle.preparation
    expect(token).not.toBe('existing')
    expect(ipcRendererMock.invoke).toHaveBeenCalledWith(
      'start-ai-re-act',
      token,
      expect.objectContaining({ Params: expect.objectContaining({ TimelineSessionID: 'existing' }) }),
    )
    await emit(token, 'pong', 'existing')
    expect(aiChatPersistStore.deleteSessionPersist).toHaveBeenCalledWith('existing')
    expect(ipcRendererMock.invoke).toHaveBeenCalledWith(
      'send-ai-re-act',
      token,
      expect.objectContaining({ SyncType: 'recovery_history' }),
    )
    await controller.handleSessionEnd('existing')
  })
  it.each([
    [undefined, 'aiChatDataStore'],
    [AISourceEnum.webFuzzer, 'WebFuzzerAiStore'],
    [AISourceEnum.im, 'aiChatDataStore'],
  ] as const)('keeps images at the client ID for Source %s without migration', async (source, imageStoreKey) => {
    const input: AIChatIPCStartParams = {
      kind: 'new',
      sessionId: 'image-session',
      route: YakitRoute.AI_Agent,
      pageId: 'page',
      localSource: 'im-Lark',
      params: {
        IsStart: true,
        Params: { Source: source, UserQuery: '![image](/image-session/image.png)' },
        AttachedResourceInfo: [
          {
            Key: AttachedResourceKeyEnum.CONTEXT_PROVIDER_KEY_FILE_PATH,
            Type: AttachedResourceTypeEnum.CONTEXT_PROVIDER_TYPE_FILE,
            Value: '/image-session/image.png',
          },
        ],
      },
    }
    const token = controller.handleStartSession(input, {
      onLinkSuccess: success,
      onPendingChange: (pending) => pendings.set(pending.streamToken, pending),
    }) as string
    await tick()
    expect(controller.getSessionPageId('image-session', YakitRoute.AI_Agent)).toBe('page')
    // A failed connection keeps the same directory; explicit cancellation cleans only this source.
    const error = ipcRendererMock.on.mock.calls.find(([name]) => name === `${token}-error`)![1]
    error({}, new Error('connect failed'))
    expect(ipcRendererMock.invoke.mock.calls.some(([name]) => name === 'discard-ai-image-draft')).toBe(false)
    controller.cancelPendingConnection(token, { keepDraft: true })
    const retry = controller.handleStartSession(input, {
      onLinkSuccess: success,
      onPendingChange: (pending) => pendings.set(pending.streamToken, pending),
    }) as string
    expect(retry).not.toBe(token)
    await tick()
    await emit(token, 'pong', 'image-session')
    expect(success).not.toHaveBeenCalled()
    await emit(retry, 'pong', 'image-session')
    expect(success).toHaveBeenCalledExactlyOnceWith('image-session')
    const question = ipcRendererMock.invoke.mock.calls.find(([, , request]) => request?.IsFreeInput)![2]
    expect(question.FreeInput).toBe(input.params.Params!.UserQuery)
    expect(question.AttachedResourceInfo[0].Value).toBe('/image-session/image.png')
    expect(
      ipcRendererMock.invoke.mock.calls.some(
        ([name]) => name === 'adopt-ai-images' || name === 'discard-ai-image-draft',
      ),
    ).toBe(false)
    await controller.handleSessionEnd('image-session')
    const abandoned = controller.handleStartSession({ ...input, sessionId: 'abandoned' }) as string
    controller.cancelPendingConnection(abandoned)
    expect(ipcRendererMock.invoke).toHaveBeenCalledWith('discard-ai-image-draft', {
      draftId: 'abandoned',
      chatDataStoreKey: imageStoreKey,
    })
  })

  it.each(['cancel', 'unload', 'delete', 'delete-id'] as const)(
    'cleans unfinished images on %s, including after failure',
    async (action) => {
      const token = await start()
      await vi.advanceTimersByTimeAsync(30000)
      expect(pendings.get(token)?.status).toBe('failed')
      expect(ipcRendererMock.invoke.mock.calls.some(([name]) => name === 'discard-ai-image-draft')).toBe(false)
      if (action === 'unload') await controller.onPageUnload(YakitRoute.AI_Agent, 'page')
      else if (action === 'delete') await controller.deleteSessions({ source: ['ai'] })
      else if (action === 'delete-id') await controller.deleteSessions({ sessionIds: ['client-session'] })
      else controller.cancelPendingConnection(token)
      expect(ipcRendererMock.invoke).toHaveBeenCalledWith('discard-ai-image-draft', {
        draftId: 'client-session',
        chatDataStoreKey: 'aiChatDataStore',
      })
      controller.cancelPendingConnection(token)
      expect(ipcRendererMock.invoke.mock.calls.filter(([name]) => name === 'discard-ai-image-draft')).toHaveLength(1)
    },
  )

  it('does not publish a session if events disagree about its identity', async () => {
    const token = await start()
    await emit(token, 'notify', 'ai-session-first')
    expect(success).not.toHaveBeenCalled()
    await emit(token, 'pong', 'ai-session-second')
    expect(success).not.toHaveBeenCalled()
    expect(pendings.get(token)).toMatchObject({
      status: 'failed',
      error: tAgent('ChatSessionNotify.sessionIdMismatch'),
    })
    expect(aiChatPersistStore.setSessionContent).not.toHaveBeenCalled()
  })

  it.each(['invoke', 'error', 'end'] as const)(
    'preserves the first question when %s fails before binding',
    async (failure) => {
      if (failure === 'invoke') {
        ipcRendererMock.invoke.mockImplementation((method) =>
          method === 'start-ai-re-act' ? Promise.reject(new Error('connect failed')) : Promise.resolve(undefined),
        )
      }
      const token = await start()
      if (failure !== 'invoke') {
        const listener = ipcRendererMock.on.mock.calls.find(([name]) => name === `${token}-${failure}`)![1]
        listener({}, new Error('connect failed'))
        await tick()
      }
      expect(pendings.get(token)).toMatchObject({
        status: 'failed',
        error: failure === 'end' ? tAgent('ChatSessionNotify.endedBeforeReady') : 'connect failed',
      })
      expect([...pendings.get(token)!.data.rawData.contents.values()][0]).toMatchObject({ data: 'first question' })
      expect(ipcRendererMock.invoke).toHaveBeenCalledWith('cancel-ai-re-act', token)
      expect(pendings.get(token)!.data.store.getState()).toMatchObject({
        execute: false,
        initLoading: false,
        pendingReply: false,
      })
      await emit(token, 'pong', 'late-session')
      await vi.advanceTimersByTimeAsync(30000)
      expect(success).not.toHaveBeenCalled()
      expect(aiChatPersistStore.setSessionContent).not.toHaveBeenCalled()
      expect(ipcRendererMock.invoke.mock.calls.some(([, , input]) => input?.IsFreeInput)).toBe(false)
      expect(yakitNotify).toHaveBeenCalledTimes(1)
    },
  )

  it('registers the pending store after history subscribes to the client ID without allocating a placeholder', async () => {
    const token = await start()
    const pending = pendings.get(token)!
    const listener = vi.fn()
    expect(controller.sessionStores.getState().has('client-session')).toBe(false)
    const unsubscribe = controller.sessionStores.subscribe(listener)

    await emit(token, 'pong', 'client-session')
    expect(success).toHaveBeenCalledExactlyOnceWith('client-session')
    expect(yakitNotify).not.toHaveBeenCalled()
    expect(controller.ensureSession('client-session').store).toBe(pending.data.store)
    expect(ipcRendererMock.invoke.mock.calls.filter(([, , request]) => request?.IsFreeInput)).toHaveLength(1)

    expect(controller.sessionStores.getState().get('client-session')).toBe(pending.data.store)
    expect(listener).toHaveBeenCalledTimes(1)
    unsubscribe()
  })

  it('follows store disposal and re-registration without keeping a stale history subscription', async () => {
    const token = await start()
    await emit(token, 'pong', 'client-session')
    const original = controller.ensureSession('client-session').store
    const listener = vi.fn()
    const unsubscribe = controller.sessionStores.subscribe(listener)
    const unloading = controller.onPageUnload(YakitRoute.AI_Agent, 'page')
    await vi.advanceTimersByTimeAsync(5000)
    await unloading
    expect(controller.sessionStores.getState().has('client-session')).toBe(false)
    expect(listener).toHaveBeenCalledTimes(1)
    const restored = controller.ensureSession('client-session').store
    expect(restored).not.toBe(original)
    expect(controller.sessionStores.getState().get('client-session')).toBe(restored)
    expect(listener).toHaveBeenCalledTimes(2)
    unsubscribe()
  })

  it('locates a pending tab immediately before any event and prevents history from occupying it', async () => {
    const token = await start('first question', 'pending-tab')
    expect(controller.getSessionPageId('client-session', YakitRoute.AI_Agent)).toBe('pending-tab')
    expect(controller.getSessionPageId('client-session', YakitRoute.HTTPFuzzer)).toBeUndefined()
    expect(controller.getSessionPageId('unrelated', YakitRoute.AI_Agent)).toBeUndefined()
    expect(controller.sessionStores.getState().has('client-session')).toBe(false)
    expect(controller.isSessionReady('client-session')).toBe(false)
    for (const kind of ['new', 'resume'] as const) {
      expect(
        controller.handleStartSession({
          kind,
          sessionId: 'client-session',
          route: YakitRoute.AI_Agent,
          pageId: 'other-tab',
          params: { IsStart: true, Params: {} },
        }),
      ).toBe(false)
    }
    expect(controller.sessionStores.getState().has('client-session')).toBe(false)
    await emit(token, 'pong', 'client-session')
    expect(success).toHaveBeenCalledExactlyOnceWith('client-session')
    expect(controller.getSessionPageId('client-session', YakitRoute.AI_Agent)).toBe('pending-tab')
  })

  it.each(['cancel', 'timeout', 'mismatch'] as const)(
    'keeps failed pending ownership until cancel (%s), without affecting other tabs',
    async (reason) => {
      const first = await start('first', 'first-tab', 'first-id')
      if (reason === 'timeout') await vi.advanceTimersByTimeAsync(30000)
      if (reason === 'cancel') controller.cancelPendingConnection(first)
      if (reason === 'mismatch') await emit(first, 'pong', 'different-id')
      await start('second', 'second-tab', 'second-id')
      expect(controller.getSessionPageId('first-id', YakitRoute.AI_Agent)).toBe(
        reason === 'cancel' ? undefined : 'first-tab',
      )
      expect(controller.getSessionPageId('second-id', YakitRoute.AI_Agent)).toBe('second-tab')
    },
  )

  it.each(['before-start', 'before-pong'] as const)(
    'refuses an occupied client ID (%s) without replacing its store',
    async (timing) => {
      const token = timing === 'before-pong' ? await start() : undefined
      const existing = controller.ensureSession('client-session')
      if (token) {
        await emit(token, 'pong', 'client-session')
        expect(pendings.get(token)).toMatchObject({
          status: 'failed',
          error: tAgent('ChatSessionNotify.sessionIdOccupied'),
        })
      } else {
        expect(await start()).toBe(false)
        expect(ipcRendererMock.invoke).not.toHaveBeenCalledWith('start-ai-re-act', expect.anything(), expect.anything())
      }
      expect(controller.ensureSession('client-session').store).toBe(existing.store)
      expect(success).not.toHaveBeenCalled()
      expect(aiChatPersistStore.setSessionContent).not.toHaveBeenCalled()
    },
  )

  it('unloading one page leaves another unbound submission running', async () => {
    const first = await start('first', 'page-one', 'first-session')
    const second = await start('second', 'page-two', 'second-session')
    controller.onPageUnload(YakitRoute.AI_Agent, 'page-one')
    await emit(first, 'pong', 'first-session')
    await emit(second, 'pong', 'second-session')
    expect(success).toHaveBeenCalledExactlyOnceWith('second-session')
    expect(ipcRendererMock.invoke).not.toHaveBeenCalledWith('cancel-ai-re-act', second)
    await controller.handleSessionEnd('second-session')
  })

  it('binds an empty new session without sending a blank first question', async () => {
    const token = await start('')
    expect(pendings.get(token)!.data.store.getState().pendingReply).toBe(false)
    expect(controller.getWorkingSessionCount()).toBe(0)
    await emit(token, 'pong', 'client-session')
    expect(controller.ensureSession('client-session').store.getState().pendingReply).toBe(false)
    expect(controller.getWorkingSessionCount()).toBe(0)
    expect(success).toHaveBeenCalledExactlyOnceWith('client-session')
    expect(ipcRendererMock.invoke.mock.calls.some(([, , input]) => input?.IsFreeInput)).toBe(false)
    expect(aiChatPersistStore.deleteSessionPersist).not.toHaveBeenCalled()
    expect(grpcQueryAIEvent).not.toHaveBeenCalled()
    await controller.handleSessionEnd('client-session')
  })
})

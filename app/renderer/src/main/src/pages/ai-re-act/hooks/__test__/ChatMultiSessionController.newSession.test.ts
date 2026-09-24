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

describe('backend allocated session identity', () => {
  let controller: ChatMultiSessionController
  let pendings: Map<string, PendingAIChat>
  const success = vi.fn()
  const start = async (question = 'first question', pageId = 'page') => {
    const token = controller.handleStartSession(
      {
        kind: 'new',
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

  it('shows the first question before handshake, binds the same store and persists only with the backend ID', async () => {
    const token = await start()
    const pending = pendings.get(token)!
    const first = [...pending.data.rawData.contents.values()][0]
    expect(first).toMatchObject({ type: AIChatQSDataTypeEnum.QUESTION, data: 'first question' })
    expect(aiChatPersistStore.setSessionContent).not.toHaveBeenCalled()
    const request = ipcRendererMock.invoke.mock.calls.find(([method]) => method === 'start-ai-re-act')![2]
    expect(request.Params).not.toHaveProperty('TimelineSessionID')
    expect(request.Params.PreferSessionCachedConfig).toBe(false)
    await emit(token, 'pong', 'ai-session-one')
    expect(controller.ensureSession('ai-session-one').store).toBe(pending.data.store)
    expect(success).toHaveBeenCalledExactlyOnceWith('ai-session-one')
    expect(aiChatPersistStore.deleteSessionPersist).not.toHaveBeenCalled()
    expect(grpcQueryAIEvent).not.toHaveBeenCalled()
    expect(aiChatPersistStore.setSessionContent).toHaveBeenCalledWith('ai-session-one', first.id, expect.any(Function))
    expect(aiChatPersistStore.setSessionRender).toHaveBeenCalledWith(
      'ai-session-one',
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
    await emit(token, 'pong', 'ai-session-one')
    expect(success).toHaveBeenCalledTimes(1)
    expect(ipcRendererMock.invoke.mock.calls.filter(([, , request]) => request?.IsFreeInput)).toHaveLength(1)
    await controller.handleSessionEnd('ai-session-one')
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
            SessionId: 'ai-session-buffered',
          },
        ),
      )
      await tick()
    }
    await emitTitle('first', 1)
    await emitTitle('second', 2)
    expect(pendings.get(token)!.data.rawData.sessionTitle).toBe('')
    expect(observed).toEqual([])
    await emit(token, 'pong', 'ai-session-buffered')
    expect(observed).toEqual(['bound', 'first', 'second'])
    await emitTitle('live', 3)
    expect(observed).toEqual(['bound', 'first', 'second', 'live'])
    unsubscribe()
    await controller.handleSessionEnd('ai-session-buffered')
  })

  it.each([undefined, 'default'])(
    'rejects an old engine (%s), disconnects and never sends the question',
    async (id) => {
      const token = await start()
      await emit(token, 'pong', id)
      expect(yakitNotify).toHaveBeenCalledWith(
        'error',
        tAgent(
          id === 'default' ? 'ChatSessionNotify.engineDefaultSession' : 'ChatSessionNotify.engineMissingSessionId',
        ),
      )
      expect(ipcRendererMock.invoke).toHaveBeenCalledWith('cancel-ai-re-act', token)
      expect(success).not.toHaveBeenCalled()
      expect(aiChatPersistStore.setSessionContent).not.toHaveBeenCalled()
      expect(pendings.get(token)?.status).toBe('failed')
      expect(ipcRendererMock.invoke.mock.calls.some(([, , request]) => request?.IsFreeInput)).toBe(false)
    },
  )

  it('keeps concurrent connections isolated and ignores late output after cancellation', async () => {
    const a = await start('a', 'a')
    const b = await start('b', 'b')
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
  ] as const)(
    'derives image storage from Source %s and rewrites paths before sending',
    async (source, imageStoreKey) => {
      let accept!: (paths: Record<string, string>) => void
      ipcRendererMock.invoke.mockImplementation((method) =>
        method === 'adopt-ai-images'
          ? new Promise((resolve) => {
              accept = resolve
            })
          : Promise.resolve(undefined),
      )
      const token = controller.handleStartSession(
        {
          kind: 'new',
          route: YakitRoute.AI_Agent,
          pageId: 'page',
          draftId: 'draft',
          localSource: 'im-Lark',
          params: {
            IsStart: true,
            Params: { Source: source, UserQuery: '![test](/draft/image.png)' },
            AttachedResourceInfo: [{ Key: 'file_path', Type: 'file', Value: '/draft/image.png' }] as any,
          },
        },
        { onLinkSuccess: success, onPendingChange: (pending) => pendings.set(pending.streamToken, pending) },
      ) as string
      await tick()
      await emit(token, 'pong', 'ai-session-image')
      expect(ipcRendererMock.invoke).toHaveBeenCalledWith('adopt-ai-images', {
        draftId: 'draft',
        sessionId: 'ai-session-image',
        chatDataStoreKey: imageStoreKey,
      })
      expect(success).not.toHaveBeenCalled()
      expect(ipcRendererMock.invoke.mock.calls.some(([, , request]) => request?.IsFreeInput)).toBe(false)
      accept({ '/draft/image.png': '/ai-session-image/image.png' })
      await tick()
      expect(success).toHaveBeenCalledExactlyOnceWith('ai-session-image')
      const freeInput = ipcRendererMock.invoke.mock.calls.find(([, , request]) => request?.IsFreeInput)![2]
      expect(freeInput.FreeInput).toBe('![test](/ai-session-image/image.png)')
      expect(freeInput.AttachedResourceInfo[0].Value).toBe('/ai-session-image/image.png')
      expect(ipcRendererMock.invoke).toHaveBeenCalledWith('discard-ai-image-draft', {
        draftId: 'draft',
        chatDataStoreKey: imageStoreKey,
      })
      await controller.handleSessionEnd('ai-session-image')
    },
  )

  it('does not publish or send after cancellation while image adoption is in flight', async () => {
    let accept!: (paths: Record<string, string>) => void
    ipcRendererMock.invoke.mockImplementation((method) =>
      method === 'adopt-ai-images'
        ? new Promise((resolve) => {
            accept = resolve
          })
        : Promise.resolve(undefined),
    )
    const token = controller.handleStartSession(
      {
        kind: 'new',
        route: YakitRoute.AI_Agent,
        pageId: 'page',
        draftId: 'draft',
        params: { IsStart: true, Params: { UserQuery: 'image' } },
      },
      { onLinkSuccess: success, onPendingChange: (pending) => pendings.set(pending.streamToken, pending) },
    ) as string
    await tick()
    await emit(token, 'pong', 'ai-session-image')
    controller.cancelPendingConnection(token)
    expect(ipcRendererMock.invoke).toHaveBeenCalledWith('discard-ai-image-draft', {
      draftId: 'draft',
      chatDataStoreKey: 'aiChatDataStore',
    })
    accept({})
    await tick()
    expect(success).not.toHaveBeenCalled()
    expect(aiChatPersistStore.setSessionContent).not.toHaveBeenCalled()
    expect(ipcRendererMock.invoke).toHaveBeenCalledWith('discard-ai-image-draft', {
      draftId: 'ai-session-image',
      chatDataStoreKey: 'aiChatDataStore',
    })
  })

  it.each(['cancel', 'unload', 'delete', 'retry'] as const)('retains a failed draft until %s', async (action) => {
    ipcRendererMock.invoke.mockImplementation((method) =>
      method === 'adopt-ai-images' ? Promise.reject(new Error('disk full')) : Promise.resolve(undefined),
    )
    const input: AIChatIPCStartParams = {
      kind: 'new',
      route: YakitRoute.AI_Agent,
      pageId: 'page',
      draftId: 'draft',
      params: { IsStart: true, Params: { UserQuery: '![image](/draft/image.png)' } },
    }
    const callbacks = {
      onLinkSuccess: success,
      onPendingChange: (pending: PendingAIChat) => pendings.set(pending.streamToken, pending),
    }
    const token = controller.handleStartSession(input, callbacks) as string
    await tick()
    await emit(token, 'pong', 'ai-session-image')
    expect(pendings.get(token)).toMatchObject({ status: 'failed', error: 'disk full' })
    expect([...pendings.get(token)!.data.rawData.contents.values()][0]).toMatchObject({
      data: '![image](/draft/image.png)',
    })
    expect(success).not.toHaveBeenCalled()
    expect(aiChatPersistStore.setSessionContent).not.toHaveBeenCalled()
    expect(ipcRendererMock.invoke.mock.calls.some(([method]) => method === 'discard-ai-image-draft')).toBe(false)
    expect(ipcRendererMock.invoke.mock.calls.some(([, , request]) => request?.IsFreeInput)).toBe(false)
    if (action === 'retry') {
      controller.cancelPendingConnection(token, { keepDraft: true })
      expect(ipcRendererMock.invoke.mock.calls.some(([method]) => method === 'discard-ai-image-draft')).toBe(false)
      ipcRendererMock.invoke.mockImplementation(() => Promise.resolve({}))
      const retryToken = controller.handleStartSession(input, callbacks) as string
      expect(retryToken).not.toBe(token)
      await tick()
      await emit(token, 'pong', 'ai-session-stale')
      expect(success).not.toHaveBeenCalled()
      await emit(retryToken, 'pong', 'ai-session-retry')
      expect(success).toHaveBeenCalledExactlyOnceWith('ai-session-retry')
      expect(ipcRendererMock.invoke.mock.calls.filter(([, , request]) => request?.IsFreeInput)).toHaveLength(1)
      await controller.handleSessionEnd('ai-session-retry')
    } else if (action === 'unload') {
      controller.onPageUnload(YakitRoute.AI_Agent, 'page')
    } else if (action === 'delete') {
      await controller.deleteSessions({ source: ['ai'] })
    } else {
      controller.cancelPendingConnection(token)
    }
    expect(ipcRendererMock.invoke).toHaveBeenCalledWith('discard-ai-image-draft', {
      draftId: 'draft',
      chatDataStoreKey: 'aiChatDataStore',
    })
    controller.cancelPendingConnection(token)
    expect(ipcRendererMock.invoke.mock.calls.filter(([method]) => method === 'discard-ai-image-draft')).toHaveLength(1)
  })

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
})

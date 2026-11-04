vi.mock('lottie-web', () => ({ default: vi.fn() }))
vi.mock('@/pages/yakRunner/utils', () => ({ isYaklangScriptDeliveryPath: vi.fn() }))
import './setupElectron'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ChatMultiSessionController } from '../ChatMultiSessionController'
import { AIChatQSDataTypeEnum } from '../aiRender'
import { YakitRoute } from '@/enums/yakitRoute'
import { ipcRendererMock, resetIpcMocks } from './setupElectron'
import { makeGrpcJsonRes, makeGrpcRes } from './fixtures'
import aiChatPersistStore from '../persist/aiChatPersistStore'
import { persistIndependentItem, drainSessionContentWrites } from '../persist/contentPersistHelper'
import { sessionStatusStore, SessionDeleteStatus } from '../sessionStatus/sessionStatusStore'
import { grpcQueryAIEvent } from '@/pages/ai-agent/grpc'
import { yakitNotify } from '@/utils/notification'

vi.mock('@/utils/notification', () => ({ yakitNotify: vi.fn() }))
vi.mock('@/pages/ai-agent/grpc', () => ({ grpcQueryAIEvent: vi.fn().mockResolvedValue({ Events: [], Total: 0 }) }))
vi.mock('../AIAgentLogEmitter', () => ({ aiAgentLogEmitter: { dispatch: vi.fn(), clearSessionBuffer: vi.fn() } }))
vi.mock('../persist/aiChatPersistStore', () => ({
  default: {
    deleteSessionPersist: vi.fn(),
    deletePersistBySource: vi.fn(),
    deleteAllPersist: vi.fn(),
    getSessionRender: vi.fn(),
    getSessionContent: vi.fn(),
    getSessionContents: vi.fn(),
    getSessionReferences: vi.fn(),
    setSessionRender: vi.fn(),
    setSessionContent: vi.fn(),
    setSessionReference: vi.fn(),
    deleteSessionContent: vi.fn(),
  },
}))

/** 控制异步读写完成时间，验证流程确实等待事务而非只等待一个微任务。 */
const deferred = <T = void>() => {
  let resolve!: (value: T) => void
  let reject!: (error: Error) => void
  const promise = new Promise<T>((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}
const tick = async () => {
  for (let i = 0; i < 15; i++) await Promise.resolve()
}
const message = (id: string) => ({ id, type: AIChatQSDataTypeEnum.THOUGHT, chatType: 'reAct', data: 'saved' }) as any
const historyEnd = (offset = 0) =>
  makeGrpcJsonRes('structured', { next_start_id: offset }, { NodeId: 'recovery_history' })

const streamTokenFor = (sessionId: string) =>
  ipcRendererMock.invoke.mock.calls.find(
    ([method, , params]) => method === 'start-ai-re-act' && params?.Params?.TimelineSessionID === sessionId,
  )?.[1]

describe('session reconnect / IDB lifecycle', () => {
  let ctrl: ChatMultiSessionController
  let sessions: Set<string>
  const begin = (id: string, query = '') => {
    sessions.add(id)
    return ctrl.handleStartSession({
      kind: 'resume',
      sessionId: id,
      route: YakitRoute.AI_Agent,
      pageId: 'page',
      params: { Params: { Source: 'ai', UserQuery: query } } as any,
    })
  }
  const start = async (id: string, query = '') => {
    begin(id, query)
    await ctrl.ensureSession(id).meta.lifecycle.preparation
    await emitIPC(id, makeGrpcJsonRes('pong', {}, { SessionId: id }))
  }
  const emitIPC = async (id: string, event: ReturnType<typeof makeGrpcRes>) => {
    const token = streamTokenFor(id)
    const listener = ipcRendererMock.on.mock.calls.find(([name]) => name === `${token}-data`)![1]
    listener({}, event)
    await ctrl.ensureSession(id).meta.lifecycle.events
  }
  const requests = () =>
    ipcRendererMock.invoke.mock.calls.filter(([method]) => method === 'send-ai-re-act').map((call) => call[2])

  beforeEach(() => {
    vi.useFakeTimers()
    vi.resetAllMocks()
    resetIpcMocks()
    vi.mocked(grpcQueryAIEvent).mockResolvedValue({ Events: [], Total: 0 } as any)
    for (const name of [
      'deleteSessionPersist',
      'deletePersistBySource',
      'deleteAllPersist',
      'setSessionRender',
      'setSessionContent',
      'setSessionReference',
      'deleteSessionContent',
    ] as const) {
      vi.mocked(aiChatPersistStore[name]).mockResolvedValue(undefined as never)
    }
    vi.mocked(aiChatPersistStore.getSessionContents).mockResolvedValue([])
    vi.mocked(aiChatPersistStore.getSessionReferences).mockResolvedValue([])
    ctrl = new ChatMultiSessionController()
    sessions = new Set()
  })
  afterEach(async () => {
    for (const id of sessions) if (ctrl.isSessionReady(id)) await ctrl.handleSessionEnd(id).catch(() => {})
    vi.useRealTimers()
  })

  it('waits for cache inspection and preserves all three tables before reconnecting', async () => {
    const cache = deferred<any>()
    vi.mocked(aiChatPersistStore.getSessionRender).mockReturnValue(cache.promise)
    const token = begin('s')
    await tick()
    expect(ipcRendererMock.invoke.mock.calls.some(([name]) => name === 'start-ai-re-act')).toBe(false)
    cache.resolve(undefined)
    await ctrl.ensureSession('s').meta.lifecycle.preparation
    expect(aiChatPersistStore.deleteSessionPersist).not.toHaveBeenCalled()
    expect(ipcRendererMock.invoke).toHaveBeenCalledWith('start-ai-re-act', token, expect.any(Object))
  })
  it('cancelling during cache preparation never starts a late connection', async () => {
    const cache = deferred<any>()
    vi.mocked(aiChatPersistStore.getSessionRender).mockReturnValue(cache.promise)
    begin('s')
    await tick()
    const old = ctrl.ensureSession('s').meta
    ctrl.forceCloseSession({ sessionIds: ['s'] })
    cache.resolve(undefined)
    await old.lifecycle.preparation
    await old.lifecycle.ending
    expect(ipcRendererMock.invoke.mock.calls.some(([name]) => name === 'start-ai-re-act')).toBe(false)
    expect(ctrl.ensureSession('s').store.getState().execute).toBe(false)
  })
  it('hydrates the retained render and its content before reporting link success', async () => {
    const item = message('saved')
    vi.mocked(aiChatPersistStore.getSessionRender).mockResolvedValue({
      grpcOffset: 17,
      source: 'ai',
      content: {
        items: { saved: { token: 'saved', version: 0 } },
        groups: {},
        tasks: {},
        chatElements: [{ token: 'saved', type: 'item' }],
      },
    } as any)
    vi.mocked(aiChatPersistStore.getSessionContents).mockResolvedValue([{ token: 'saved', content: item }] as any)
    const linked = vi.fn()
    ctrl.handleStartSession(
      {
        kind: 'resume',
        sessionId: 's',
        route: YakitRoute.AI_Agent,
        pageId: 'page',
        params: { Params: { Source: 'ai' } },
      },
      { onLinkSuccess: linked },
    )
    sessions.add('s')
    await ctrl.ensureSession('s').meta.lifecycle.preparation
    await emitIPC('s', makeGrpcJsonRes('pong', {}, { SessionId: 's' }))
    expect(ctrl.ensureSession('s').rawData.contents.get('saved')).toMatchObject({ id: 'saved', data: 'saved' })
    expect(linked).toHaveBeenCalledWith('s')
    expect(aiChatPersistStore.deleteSessionPersist).not.toHaveBeenCalled()
  })
  it('uses a fresh transport token and rejects events from the previous connection', async () => {
    await start('s')
    const oldToken = streamTokenFor('s')
    const oldListener = ipcRendererMock.on.mock.calls.find(([name]) => name === `${oldToken}-data`)![1]
    await ctrl.handleSessionEnd('s')
    const next = begin('s')
    await ctrl.ensureSession('s').meta.lifecycle.preparation
    expect(next).not.toBe(oldToken)
    oldListener(
      {},
      makeGrpcJsonRes('structured', { revision: 10, tasks: [{ task_id: 'old' }] }, { NodeId: 'session_snapshot' }),
    )
    await tick()
    expect(ctrl.ensureSession('s').store.getState().sessionTaskList).toEqual([])
  })
  it('shares duplicate end teardown and waits for pending content transactions', async () => {
    await start('s')
    const write = deferred<any>()
    vi.mocked(aiChatPersistStore.setSessionContent).mockReturnValueOnce(write.promise)
    const lifecycle = ctrl.ensureSession('s').meta.lifecycle
    persistIndependentItem('s', message('pending'), lifecycle)
    await tick()
    const ended = vi.fn()
    ctrl.forceCloseSession({ sessionIds: ['s'], onEnd: ended })
    const first = ctrl.handleSessionEnd('s')
    expect(ctrl.handleSessionEnd('s')).toBe(first)
    await tick()
    expect(ended).not.toHaveBeenCalled()
    write.resolve(undefined)
    await first
    expect(ended).toHaveBeenCalledTimes(1)
    expect(ctrl.isSessionReady('s')).toBe(false)
  })
  it('invalidates old content writers after reconnect', async () => {
    await start('s')
    const old = ctrl.ensureSession('s').meta.lifecycle
    await ctrl.handleSessionEnd('s')
    await start('s')
    vi.mocked(aiChatPersistStore.setSessionContent).mockClear()
    await persistIndependentItem('s', message('stale'), old)
    expect(aiChatPersistStore.setSessionContent).not.toHaveBeenCalled()
  })
  it('deletion drains writes before removing cache and late output cannot recreate it', async () => {
    await start('s')
    const token = streamTokenFor('s')
    const listener = ipcRendererMock.on.mock.calls.find(([name]) => name === `${token}-data`)![1]
    const deletion = ctrl.deleteSessions({ sessionIds: ['s'] })
    await vi.advanceTimersByTimeAsync(5000)
    await deletion
    expect(aiChatPersistStore.deleteSessionPersist).toHaveBeenCalledWith('s')
    listener(
      {},
      makeGrpcJsonRes('structured', { revision: 9, tasks: [{ task_id: 'late' }] }, { NodeId: 'session_snapshot' }),
    )
    await tick()
    expect(ctrl.sessionStores.getState().has('s')).toBe(false)
  })
  it('reports final-save failure while releasing the channel for retry', async () => {
    await start('s')
    vi.mocked(aiChatPersistStore.setSessionRender).mockRejectedValueOnce(new Error('disk failed'))
    await expect(ctrl.handleSessionEnd('s')).rejects.toThrow('disk failed')
    expect(ctrl.isSessionReady('s')).toBe(false)
  })
})

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

describe('session reconnect / IDB lifecycle', () => {
  let ctrl: ChatMultiSessionController
  let sessions: Set<string>
  const begin = (id: string, query = '') => {
    sessions.add(id)
    return ctrl.handleStartSession({
      token: id,
      route: YakitRoute.AI_Agent,
      pageId: 'page',
      params: { Params: { Source: 'ai', UserQuery: query } } as any,
    })
  }
  const start = async (id: string, query = '') => {
    begin(id, query)
    await ctrl.ensureSession(id).meta.lifecycle.preparation
    await ctrl.handleGrpcOutputEvent(id, makeGrpcJsonRes('pong', {}))
  }
  const requests = () =>
    ipcRendererMock.invoke.mock.calls.filter(([method]) => method === 'send-ai-re-act').map((call) => call[2])

  beforeEach(() => {
    vi.useFakeTimers()
    vi.resetAllMocks()
    resetIpcMocks()
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

  it('clears old cache before IPC, resets memory in the same store and recovers from zero', async () => {
    const cleanup = deferred()
    vi.mocked(aiChatPersistStore.deleteSessionPersist).mockReturnValueOnce(cleanup.promise)
    const old = ctrl.ensureSession('s')
    old.rawData.grpcOffset = 999
    old.rawData.contents.set('old', message('old'))
    old.store.getState().dispatchStreamingNode({
      chatType: 'reAct',
      node: { token: 'old', kind: 'item', type: AIChatQSDataTypeEnum.THOUGHT },
    })
    begin('s')
    await tick()
    expect(ipcRendererMock.invoke).not.toHaveBeenCalledWith('start-ai-re-act', expect.anything(), expect.anything())
    expect(begin('s')).toBe(false)
    cleanup.resolve()
    await ctrl.ensureSession('s').meta.lifecycle.preparation
    expect(ctrl.ensureSession('s').store).toBe(old.store)
    expect(old.store.getState().chatElements).toEqual([])
    expect(old.rawData.contents.size).toBe(0)
    await ctrl.handleGrpcOutputEvent('s', makeGrpcJsonRes('pong', {}))
    expect(requests().find((request) => request.SyncType === 'recovery_history')?.SyncJsonInput).toBe(
      JSON.stringify({ start_id: 0, limit: 60 }),
    )
    expect(aiChatPersistStore.getSessionRender).not.toHaveBeenCalled()
    await ctrl.handleGrpcOutputEvent('s', historyEnd())
    expect(old.store.getState().initLoading).toBe(false)
  })

  it('sends the pending question only after first history and its writes finish, once', async () => {
    const write = deferred()
    vi.mocked(aiChatPersistStore.setSessionContent).mockReturnValueOnce(write.promise as any)
    await start('s', 'new question')
    expect(requests().some((request) => request.IsFreeInput)).toBe(false)
    const finished = ctrl.handleGrpcOutputEvent('s', historyEnd(88))
    await tick()
    expect(requests().some((request) => request.IsFreeInput)).toBe(false)
    expect(ctrl.ensureSession('s').store.getState().initLoading).toBe(true)
    write.resolve()
    await finished
    await ctrl.handleGrpcOutputEvent('s', makeGrpcJsonRes('pong', {}))
    expect(requests().filter((request) => request.IsFreeInput)).toHaveLength(1)
    ctrl.requestRecoveryHistory('s')
    expect(requests().at(-1).SyncJsonInput).toBe(JSON.stringify({ start_id: 88, limit: 60 }))
  })

  it('processes async history handlers before the history-end receipt', async () => {
    await start('s', 'question')
    const read = deferred<any>()
    vi.mocked(aiChatPersistStore.getSessionContent).mockReturnValueOnce(read.promise)
    const event = ctrl.handleGrpcOutputEvent(
      's',
      makeGrpcRes({
        Type: 'stream',
        NodeId: 'answer',
        EventUUID: 'writer',
        Content: new TextEncoder().encode('history'),
        IsSync: true,
      }),
    )
    const done = ctrl.handleGrpcOutputEvent('s', historyEnd())
    await tick()
    expect(requests().some((request) => request.IsFreeInput)).toBe(false)
    read.resolve(undefined)
    await Promise.all([event, done])
    expect(ctrl.ensureSession('s').rawData.contents.has('writer')).toBe(true)
    expect(requests().filter((request) => request.IsFreeInput)).toHaveLength(1)
  })

  it('closing during preparation prevents a late IPC start and waits for cleanup', async () => {
    const cleanup = deferred()
    vi.mocked(aiChatPersistStore.deleteSessionPersist).mockReturnValueOnce(cleanup.promise)
    begin('s')
    await tick()
    const onEnd = vi.fn()
    ctrl.forceCloseSession({ sessionIds: ['s'], onEnd })
    await tick()
    expect(onEnd).not.toHaveBeenCalled()
    cleanup.resolve()
    await ctrl.ensureSession('s').meta.lifecycle.ending
    expect(ctrl.isSessionReady('s')).toBe(false)
    expect(ipcRendererMock.invoke.mock.calls.some(([method]) => method === 'start-ai-re-act')).toBe(false)
    expect(onEnd).toHaveBeenCalledOnce()
  })

  it('ordinary close preserves cache and waits for writes before onEnd; reconnect clears again', async () => {
    await start('s')
    await ctrl.handleGrpcOutputEvent('s', historyEnd())
    const { meta } = ctrl.ensureSession('s')
    const write = deferred()
    vi.mocked(aiChatPersistStore.setSessionContent).mockReturnValueOnce(write.promise as any)
    const saving = persistIndependentItem('s', message('saved'), meta.lifecycle)
    await tick()
    const onEnd = vi.fn()
    ctrl.forceCloseSession({ sessionIds: ['s'], onEnd })
    const end = ctrl.handleSessionEnd('s')
    await tick()
    expect(onEnd).not.toHaveBeenCalled()
    expect(ctrl.isSessionReady('s')).toBe(true)
    write.resolve()
    await Promise.all([saving, end])
    expect(onEnd).toHaveBeenCalledWith(undefined)
    expect(aiChatPersistStore.deleteSessionPersist).toHaveBeenCalledTimes(1)
    await start('s')
    expect(aiChatPersistStore.deleteSessionPersist).toHaveBeenCalledTimes(2)
    expect(meta.lifecycle.current).toBe(false)
  })

  it('deletion invalidates a pending IDB read and waits before removing the cache', async () => {
    await start('s')
    await ctrl.handleGrpcOutputEvent('s', historyEnd())
    const read = deferred<any>()
    vi.mocked(aiChatPersistStore.getSessionContent).mockReturnValueOnce(read.promise)
    const old = ctrl.ensureSession('s')
    const event = ctrl.handleGrpcOutputEvent('s', makeGrpcRes({ Type: 'stream', NodeId: 'answer', EventUUID: 'late' }))
    await tick()
    const deleting = ctrl.deleteSessions({ sessionIds: ['s'] })
    const end = ctrl.handleSessionEnd('s')
    await tick()
    expect(aiChatPersistStore.deleteSessionPersist).toHaveBeenCalledTimes(1)
    read.resolve(message('late'))
    await Promise.all([event, deleting, end])
    expect(old.rawData.contents.has('late')).toBe(false)
    expect(aiChatPersistStore.deleteSessionPersist).toHaveBeenCalledTimes(2)
  })

  it('cleanup failure releases the channel and retry can start', async () => {
    vi.mocked(aiChatPersistStore.deleteSessionPersist).mockRejectedValueOnce(new Error('clear failed'))
    begin('s')
    const { lifecycle } = ctrl.ensureSession('s').meta
    await lifecycle.preparation
    await lifecycle.ending?.catch(() => {})
    expect(ctrl.isSessionReady('s')).toBe(false)
    expect(ipcRendererMock.invoke.mock.calls.some(([method]) => method === 'start-ai-re-act')).toBe(false)
    await start('s')
    expect(ctrl.isSessionReady('s')).toBe(true)
  })

  it('history error does not send the question and closes loading', async () => {
    await start('s', 'keep this question')
    await ctrl.handleGrpcOutputEvent(
      's',
      makeGrpcJsonRes('structured', { error: 'recovery failed' }, { NodeId: 'recovery_history' }),
    )
    await ctrl.handleSessionEnd('s').catch(() => {})
    expect(requests().some((request) => request.IsFreeInput)).toBe(false)
    expect(ctrl.ensureSession('s').store.getState().initLoading).toBe(false)
    expect(
      [...ctrl.ensureSession('s').rawData.contents.values()].some(
        (item) => item.type === AIChatQSDataTypeEnum.QUESTION,
      ),
    ).toBe(true)
  })

  it('failed delete resets deletion status instead of reporting deleted', async () => {
    vi.mocked(aiChatPersistStore.deleteSessionPersist).mockRejectedValueOnce(new Error('delete failed'))
    await expect(ctrl.deleteSessions({ sessionIds: ['orphan'] })).rejects.toThrow('delete failed')
    expect(sessionStatusStore.getState().deleteStatuses.get('orphan')).toBe(SessionDeleteStatus.Idle)
  })

  it('old writes cannot reenter after reconnect, including an old token not previously queued', async () => {
    await start('s')
    await ctrl.handleGrpcOutputEvent('s', historyEnd())
    const old = ctrl.ensureSession('s').meta.lifecycle
    await ctrl.handleSessionEnd('s')
    await start('s')
    vi.mocked(aiChatPersistStore.setSessionContent).mockClear()
    await persistIndependentItem('s', message('late'), old)
    await drainSessionContentWrites('s')
    expect(aiChatPersistStore.setSessionContent).not.toHaveBeenCalled()
  })

  it('blocks new connections during source cleanup and releases the block after commit', async () => {
    const cleanup = deferred()
    vi.mocked(aiChatPersistStore.deletePersistBySource).mockReturnValueOnce(cleanup.promise)
    const deleting = ctrl.deleteSessions({ source: ['ai'] })
    await tick()
    expect(begin('new')).toBe(false)
    expect(ctrl.isSessionReady('new')).toBe(false)
    cleanup.resolve()
    await deleting
    await start('new')
    expect(ctrl.isSessionReady('new')).toBe(true)
  })

  it('preserves page-unload cache only after the final render transaction finishes', async () => {
    await start('s')
    await ctrl.handleGrpcOutputEvent('s', historyEnd())
    const finalWrite = deferred()
    vi.mocked(aiChatPersistStore.setSessionRender).mockReturnValueOnce(finalWrite.promise)
    const old = ctrl.ensureSession('s')
    ctrl.onPageUnload(YakitRoute.AI_Agent, 'page')
    const ending = ctrl.handleSessionEnd('s')
    await tick()
    expect(ctrl.isSessionReady('s')).toBe(true)
    expect(ctrl.ensureSession('s').store).toBe(old.store)
    finalWrite.resolve()
    await ending
    expect(ctrl.isSessionReady('s')).toBe(false)
    expect(ctrl.ensureSession('s').store).not.toBe(old.store)
    expect(aiChatPersistStore.deleteSessionPersist).toHaveBeenCalledTimes(1)
  })

  it('reports a final-save failure after releasing the connection instead of claiming success', async () => {
    await start('s')
    await ctrl.handleGrpcOutputEvent('s', historyEnd())
    vi.mocked(aiChatPersistStore.setSessionRender).mockRejectedValueOnce(new Error('commit failed'))
    const onEnd = vi.fn()
    ctrl.forceCloseSession({ sessionIds: ['s'], onEnd })
    await expect(ctrl.handleSessionEnd('s')).rejects.toThrow('commit failed')
    expect(ctrl.isSessionReady('s')).toBe(false)
    expect(onEnd).toHaveBeenCalledWith(expect.objectContaining({ message: 'commit failed' }))
    await start('s')
    expect(ctrl.isSessionReady('s')).toBe(true)
  })
})

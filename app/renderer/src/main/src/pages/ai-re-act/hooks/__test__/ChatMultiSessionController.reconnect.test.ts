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

  it.each([false, true])('publishes history after both queries finish (sub Agent first=%s)', async (subAgentFirst) => {
    const history = deferred<any>()
    const subAgents = deferred<any>()
    vi.mocked(grpcQueryAIEvent).mockReturnValueOnce(history.promise).mockReturnValueOnce(subAgents.promise)
    const { meta } = ctrl.ensureSession('s')
    const loaded = ctrl['loadSessionHistoryBeforeStart']('s', meta)
    expect(grpcQueryAIEvent).toHaveBeenNthCalledWith(
      1,
      {
        Filter: {
          SessionID: 's',
          EventType: ['start_plan_and_execution'],
        },
        Pagination: { Page: 1, Limit: -1, OrderBy: 'id', Order: 'asc' },
      },
      true,
    )
    expect(grpcQueryAIEvent).toHaveBeenNthCalledWith(
      2,
      {
        Filter: { SessionID: 's', EventType: ['structured'], NodeId: ['react_task_created'] },
        Pagination: { Page: 1, Limit: -1, OrderBy: 'id', Order: 'asc' },
      },
      true,
    )
    expect(ctrl.ensureSession('s').meta.planExecutionHistoryEvents).toEqual([])
    expect(ctrl.ensureSession('s').meta.subAgentHistoryEvents).toEqual([])
    const plan = { coordinator_id: 'plan-1', 're-act_task': 'question-1' }
    const subAgent = { react_task_id: 'child-1', react_task_is_sub_agent: true }
    const events = [
      makeGrpcJsonRes('start_plan_and_execution', plan),
      makeGrpcRes({ Type: 'start_plan_and_execution', Content: Buffer.from('invalid json') }),
    ]
    const taskEvents = [
      makeGrpcJsonRes('structured', subAgent, { NodeId: 'react_task_created' }),
      makeGrpcJsonRes('structured', { react_task_is_sub_agent: false }, { NodeId: 'react_task_created' }),
      makeGrpcJsonRes('structured', { react_task_is_sub_agent: 'true' }, { NodeId: 'react_task_created' }),
      makeGrpcJsonRes('structured', { react_task_is_sub_agent: 'false' }, { NodeId: 'react_task_created' }),
      makeGrpcJsonRes('structured', { react_task_is_sub_agent: 1 }, { NodeId: 'react_task_created' }),
      makeGrpcJsonRes('structured', {}, { NodeId: 'react_task_created' }),
      makeGrpcJsonRes('structured', null, { NodeId: 'react_task_created' }),
      makeGrpcRes({ Type: 'structured', NodeId: 'react_task_created', Content: Buffer.from('invalid json') }),
    ]
    // 两种完成顺序均需等另一请求结束后统一发布历史。
    if (subAgentFirst) subAgents.resolve({ Events: taskEvents })
    else history.resolve({ Events: events })
    await tick()
    expect(ctrl.ensureSession('s').meta.planExecutionHistoryEvents).toEqual([])
    expect(ctrl.ensureSession('s').meta.subAgentHistoryEvents).toEqual([])
    history.resolve({ Events: events, Total: 2 })
    subAgents.resolve({ Events: taskEvents })
    await loaded
    expect(ctrl.ensureSession('s').meta.planExecutionHistoryEvents).toEqual([plan])
    expect(ctrl.ensureSession('s').meta.subAgentHistoryEvents).toEqual([subAgent])
    expect(vi.getTimerCount()).toBe(0)
  })

  it('stores sub Agent history only when both Type and NodeId match', async () => {
    const subAgent = { react_task_id: 'child-1', react_task_is_sub_agent: true }
    vi.mocked(grpcQueryAIEvent)
      .mockResolvedValueOnce({ Events: [] } as any)
      .mockResolvedValueOnce({
        Events: [
          makeGrpcJsonRes('stream', subAgent, { NodeId: 'react_task_created' }),
          makeGrpcJsonRes('structured', subAgent, { NodeId: 'react_task_status_changed' }),
          makeGrpcJsonRes('stream', subAgent, { NodeId: 'other' }),
          makeGrpcJsonRes('structured', subAgent, { NodeId: 'react_task_created' }),
        ],
      } as any)
    await ctrl['loadSessionHistoryBeforeStart']('s', ctrl.ensureSession('s').meta)
    expect(ctrl.ensureSession('s').meta.subAgentHistoryEvents).toEqual([subAgent])
  })

  it.each(['invalidated', 'closing'])('discards history when the connection becomes %s', async (state) => {
    const history = deferred<any>()
    vi.mocked(grpcQueryAIEvent)
      .mockResolvedValueOnce({ Events: [makeGrpcJsonRes('start_plan_and_execution', { coordinator_id: 'p' })] } as any)
      .mockReturnValueOnce(history.promise)
    const { meta } = ctrl.ensureSession('s')
    const loaded = ctrl['loadSessionHistoryBeforeStart']('s', meta)
    if (state === 'invalidated') meta.lifecycle.current = false
    else meta.lifecycle.closing = true
    history.resolve({
      Events: [makeGrpcJsonRes('structured', { react_task_is_sub_agent: true }, { NodeId: 'react_task_created' })],
    })
    await loaded
    expect(ctrl.ensureSession('s').meta.planExecutionHistoryEvents).toEqual([])
    expect(ctrl.ensureSession('s').meta.subAgentHistoryEvents).toEqual([])
    expect(ipcRendererMock.invoke.mock.calls.some(([method]) => method === 'start-ai-re-act')).toBe(false)
    expect(vi.getTimerCount()).toBe(0)
  })

  it.each(['plan', 'sub Agent', 'both'])('tolerates %s query failure and keeps successful history', async (failed) => {
    const plan = { coordinator_id: 'plan-1' }
    const subAgent = { react_task_id: 'child-1', react_task_is_sub_agent: true }
    vi.mocked(grpcQueryAIEvent).mockImplementation(async (request) => {
      const isPlan = request.Filter?.EventType?.includes('start_plan_and_execution')
      if (failed === 'both' || (isPlan ? failed === 'plan' : failed === 'sub Agent')) throw new Error('query failed')
      return {
        Events: [
          isPlan
            ? makeGrpcJsonRes('start_plan_and_execution', plan)
            : makeGrpcJsonRes('structured', subAgent, { NodeId: 'react_task_created' }),
        ],
      } as any
    })
    const { meta } = ctrl.ensureSession('s')
    await ctrl['loadSessionHistoryBeforeStart']('s', meta)
    expect(meta.planExecutionHistoryEvents).toEqual(failed === 'sub Agent' ? [plan] : [])
    expect(meta.subAgentHistoryEvents).toEqual(failed === 'plan' ? [subAgent] : [])
    expect(meta.lifecycle.error).toBeUndefined()
    expect(meta.lifecycle.ending).toBeUndefined()
    expect(ipcRendererMock.invoke).not.toHaveBeenCalled()
    expect(vi.getTimerCount()).toBe(0)
  })

  it.each(['success', 'failure', 'pending'])('waits at most 5 seconds with the other query %s', async (other) => {
    const late = deferred<any>()
    const second = deferred<any>()
    const plan = { coordinator_id: 'plan-1' }
    vi.mocked(grpcQueryAIEvent).mockReturnValueOnce(second.promise).mockReturnValueOnce(late.promise)
    const { meta } = ctrl.ensureSession('s')
    const settled = vi.fn()
    const loaded = ctrl['loadSessionHistoryBeforeStart']('s', meta).then(settled)
    if (other === 'success') second.resolve({ Events: [makeGrpcJsonRes('start_plan_and_execution', plan)] })
    if (other === 'failure') second.reject(new Error('query failed'))
    await vi.advanceTimersByTimeAsync(4999)
    expect(settled).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    await loaded
    expect(settled).toHaveBeenCalledOnce()
    expect(meta.planExecutionHistoryEvents).toEqual(other === 'success' ? [plan] : [])
    expect(meta.subAgentHistoryEvents).toEqual([])
    expect(meta.lifecycle.error).toBeUndefined()

    // 超时后成功或失败的响应均不能回填历史或写入连接错误。
    late.resolve({
      Events: [makeGrpcJsonRes('structured', { react_task_is_sub_agent: true }, { NodeId: 'react_task_created' })],
    })
    if (other === 'pending') second.reject(new Error('late failure'))
    await tick()
    expect(meta.subAgentHistoryEvents).toEqual([])
    expect(meta.lifecycle.error).toBeUndefined()
    expect(ipcRendererMock.invoke).not.toHaveBeenCalled()
    expect(vi.getTimerCount()).toBe(0)
  })

  it.each(['invalidated', 'closing'])('does not query an already %s connection', async (state) => {
    const { meta } = ctrl.ensureSession('s')
    if (state === 'invalidated') meta.lifecycle.current = false
    else meta.lifecycle.closing = true
    await ctrl['loadSessionHistoryBeforeStart']('s', meta)
    expect(grpcQueryAIEvent).not.toHaveBeenCalled()
    expect(vi.getTimerCount()).toBe(0)
  })

  it.each(['', 'new question'])('starts without the currently disabled history prequery (query=%j)', async (query) => {
    // 生产入口暂时注释了预查询；上面的用例单独验证保留的方法，不在测试中重新接回入口。
    await start('s', query)
    expect(grpcQueryAIEvent).not.toHaveBeenCalled()
    expect(ipcRendererMock.invoke).toHaveBeenCalledWith('start-ai-re-act', 's', expect.anything())
    const oldMeta = ctrl.ensureSession('s').meta
    oldMeta.planExecutionHistoryEvents.push({
      coordinator_id: 'old-plan',
      're-act_id': 's',
      're-act_task': 'old-question',
    })
    await ctrl.handleSessionEnd('s')
    await start('s', query)
    expect(ctrl.ensureSession('s').meta).not.toBe(oldMeta)
    expect(ctrl.ensureSession('s').meta.planExecutionHistoryEvents).toEqual([])
    expect(ctrl.ensureSession('s').meta.subAgentHistoryEvents).toEqual([])
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
    expect(grpcQueryAIEvent).not.toHaveBeenCalled()
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

  it.each(['closing', 'closed'])('rejects history while %s and allows it after reconnect', async (state) => {
    await start('s')
    await ctrl.handleGrpcOutputEvent('s', historyEnd(88))
    ctrl.forceCloseSession({ sessionIds: ['s'] })
    if (state === 'closed') await ctrl.handleSessionEnd('s')
    const requestCount = requests().length

    expect(ctrl.requestRecoveryHistory('s')).toBe(false)
    expect(requests()).toHaveLength(requestCount)
    expect(ctrl.ensureSession('s').store.getState().grpcLoadMoreLoading).toBe(false)

    await ctrl.handleSessionEnd('s')
    await start('s')
    await ctrl.handleGrpcOutputEvent('s', historyEnd(88))
    expect(ctrl.requestRecoveryHistory('s')).toBe(true)
    expect(ctrl.ensureSession('s').store.getState().grpcLoadMoreLoading).toBe(true)
    expect(requests().at(-1).SyncJsonInput).toBe(JSON.stringify({ start_id: 88, limit: 60 }))
    const acceptedCount = requests().length
    expect(ctrl.requestRecoveryHistory('s')).toBe(false)
    expect(requests()).toHaveLength(acceptedCount)
  })

  it('does not start history loading before the connection has started', async () => {
    const cleanup = deferred()
    vi.mocked(aiChatPersistStore.deleteSessionPersist).mockReturnValueOnce(cleanup.promise)
    begin('s')
    try {
      expect(ctrl.requestRecoveryHistory('s')).toBe(false)
      expect(requests()).toHaveLength(0)
      expect(ctrl.ensureSession('s').store.getState().grpcLoadMoreLoading).toBe(false)
    } finally {
      cleanup.resolve()
    }
    await ctrl.ensureSession('s').meta.lifecycle.preparation
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

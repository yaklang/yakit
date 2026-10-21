import './setupElectron'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ChatMultiSessionController } from '../ChatMultiSessionController'
import { YakitRoute } from '@/enums/yakitRoute'
import { ipcRendererMock, resetIpcMocks } from './setupElectron'
import { makeGrpcJsonRes } from './fixtures'
import type { AIEventQueryResponse, AIOutputEvent } from '../grpcApi'
import type * as ElectronBridge from '@/services/electronBridge'
import { yakitNotify } from '@/utils/notification'
import i18n from '@/i18n/i18n'
import { grpcQueryAIEvent } from '@/pages/ai-agent/grpc'

const { write } = vi.hoisted(() => ({ write: vi.fn() }))
vi.mock('@/services/electronBridge', async (importOriginal) => ({
  ...(await importOriginal<typeof ElectronBridge>()),
  yakitClipboard: { setText: write },
}))

vi.mock('@/utils/notification', () => ({ yakitNotify: vi.fn() }))
vi.mock('@/pages/ai-agent/grpc', () => ({ grpcQueryAIEvent: vi.fn().mockResolvedValue({ Events: [] }) }))
vi.mock('../AIAgentLogEmitter', () => ({ aiAgentLogEmitter: { dispatch: vi.fn() } }))
vi.mock('../persist/aiChatPersistStore', () => ({
  default: {
    setSessionRender: vi.fn().mockResolvedValue(undefined),
    setSessionContent: vi.fn().mockResolvedValue(undefined),
    setSessionReference: vi.fn().mockResolvedValue(undefined),
    deleteSessionPersist: vi.fn().mockResolvedValue(undefined),
    getSessionRender: vi.fn().mockResolvedValue(undefined),
    getSessionContents: vi.fn().mockResolvedValue([]),
    getSessionReferences: vi.fn().mockResolvedValue([]),
  },
}))

const tick = async () => {
  for (let i = 0; i < 30; i++) await Promise.resolve()
}
const emit = (token: string, res: AIOutputEvent) => {
  ipcRendererMock.on.mock.calls.find(([name]) => name === `${token}-data`)![1]({}, res)
}
const response = (id: string, extra: Partial<AIOutputEvent> = {}) => ({
  ...makeGrpcJsonRes(
    'structured',
    {
      total_entries: 0,
      limit: 50,
      entries: null,
      dump: '  中文\n<tag>"\\</tag>  ',
    },
    { NodeId: 'timeline', IsJson: true, IsSync: true, SyncID: id },
  ),
  ...extra,
})

describe('timeline dump requests', () => {
  let controller: ChatMultiSessionController
  const start = async (sessionId = 'session') => {
    const token = controller.handleStartSession({
      kind: 'new',
      sessionId,
      route: YakitRoute.AI_Agent,
      pageId: 'page',
      params: { IsStart: true, Params: { Source: 'ai' } },
    }) as string
    await tick()
    emit(token, makeGrpcJsonRes('pong', {}, { SessionId: sessionId }))
    await tick()
    return token
  }
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    write.mockResolvedValue(undefined)
    resetIpcMocks()
    controller = new ChatMultiSessionController()
  })
  afterEach(async () => {
    await controller.handleSessionEnd('session').catch(() => {})
    await controller.handleSessionEnd('other').catch(() => {})
    vi.useRealTimers()
  })
  const state = (sessionId = 'session') => controller.ensureSession(sessionId).store.getState()
  const send = (id: string, sessionId = 'session') => {
    return controller.handleSendMessage({
      token: sessionId,
      type: 'casual',
      params: { IsSyncMessage: true, SyncType: 'timeline', SyncID: id, SyncJsonInput: JSON.stringify({ limit: 50 }) },
    })
  }

  it('uses the existing send path, completes the sync ID and caches the exact dump without copying', async () => {
    const token = await start()
    ipcRendererMock.invoke.mockImplementation((method, sentToken, request) => {
      if (method === 'send-ai-re-act' && request.SyncType === 'timeline') {
        expect(sentToken).toBe(token)
        expect(request).toEqual({
          IsSyncMessage: true,
          SyncType: 'timeline',
          SyncID: 'dump-1',
          SyncJsonInput: '{"limit":50}',
        })
        emit(token, response(request.SyncID))
      }
      return Promise.resolve()
    })
    expect(send('dump-1')).toBe(true)
    await tick()
    expect(controller.ensureSession('session').meta.syncIDMap.has('dump-1')).toBe(false)
    expect(controller.ensureSession('session').rawData.timelineDump).toBe('  中文\n<tag>"\\</tag>  ')
    expect(state().timelineDumpUpdate).toBe(1)
    expect(write).not.toHaveBeenCalled()
    expect(yakitNotify).not.toHaveBeenCalled()
  })

  it('ignores unrelated event types, nodes and non-sync or non-JSON events', async () => {
    const token = await start()
    send('dump-1')
    for (const extra of [{ Type: 'stream' }, { NodeId: 'other' }, { IsJson: false }, { IsSync: false }]) {
      emit(token, response('dump-1', extra))
    }
    await tick()
    expect(controller.ensureSession('session').rawData.timelineDump).toBeUndefined()
    expect(write).not.toHaveBeenCalled()
  })

  it.each([
    [{ dump: '' }, ''],
    [{ entries: [] }, ''],
  ])('caches empty or missing dumps as empty strings without notifying or copying: %j', async (payload, dump) => {
    const token = await start()
    send('dump-1')
    emit(token, response('dump-1', { Content: new TextEncoder().encode(JSON.stringify(payload)) }))
    await tick()
    expect(controller.ensureSession('session').rawData.timelineDump).toBe(dump)
    expect(write).not.toHaveBeenCalled()
    expect(yakitNotify).not.toHaveBeenCalled()
  })

  it('keeps dumps isolated by session and replaces cached data on the next response', async () => {
    const token = await start()
    const other = await start('other')
    send('dump-1')
    emit(token, response('dump-1'))
    await tick()
    expect(controller.ensureSession('other').rawData.timelineDump).toBeUndefined()
    send('dump-2', 'other')
    emit(other, response('dump-2', { Content: new TextEncoder().encode('{"dump":"other dump"}') }))
    send('dump-3')
    emit(token, response('dump-3', { Content: new TextEncoder().encode('{"dump":"new dump"}') }))
    await tick()
    expect(controller.ensureSession('session').rawData.timelineDump).toBe('new dump')
    expect(controller.ensureSession('other').rawData.timelineDump).toBe('other dump')
    expect(state().timelineDumpUpdate).toBe(2)
    expect(state('other').timelineDumpUpdate).toBe(1)
  })

  const timelineItem = (id: number) => ({
    id,
    timestamp: id,
    deleted: false,
    type: 'text',
    content: `timeline ${id}`,
  })
  const timelinePage = (ids: number[]): AIEventQueryResponse => ({
    Total: ids.length,
    Pagination: { Page: 1, Limit: 200, OrderBy: 'created_at', Order: 'desc' },
    Events: ids.map((id) => ({
      ...makeGrpcJsonRes('structured', timelineItem(id), { NodeId: 'timeline_item' }),
      ID: id,
    })),
  })

  it('refreshes the latest page and preserves streamed items while replacing old history', async () => {
    await start()
    const { rawData } = controller.ensureSession('session')
    rawData.timelineBeforeId = 10
    rawData.timelineNoMore = true
    controller.ensureSession('session').store.setState({ reActTimelines: [timelineItem(1)] })
    let resolvePage!: (page: AIEventQueryResponse) => void
    vi.mocked(grpcQueryAIEvent).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolvePage = resolve
        }),
    )

    const pending = controller.loadTimelineHistory('session', true)
    expect(grpcQueryAIEvent).toHaveBeenLastCalledWith(
      expect.objectContaining({
        Pagination: { Page: 1, Limit: 200, OrderBy: 'created_at', Order: 'desc' },
      }),
      true,
    )
    expect(state().timelinesLoading).toBe(true)
    expect(state().reActTimelines).toEqual([])
    expect(rawData.timelineBeforeId).toBe(0)
    expect(controller.hasMoreTimeline('session')).toBe(true)

    state().updateTimeLineItem(timelineItem(201))
    state().updateTimeLineItem(timelineItem(202))
    resolvePage(timelinePage(Array.from({ length: 200 }, (_, index) => 201 - index)))
    expect(await pending).toBe(true)
    expect(state().reActTimelines.map(({ id }) => id)).toEqual(Array.from({ length: 201 }, (_, index) => index + 2))
    expect(rawData.timelineBeforeId).toBe(2)
    expect(controller.hasMoreTimeline('session')).toBe(true)
    expect(state().timelinesLoading).toBe(false)
  })

  it('clears old history when the refreshed latest page is empty', async () => {
    await start()
    const { rawData } = controller.ensureSession('session')
    rawData.timelineBeforeId = 10
    controller.ensureSession('session').store.setState({ reActTimelines: [timelineItem(1)] })
    vi.mocked(grpcQueryAIEvent).mockResolvedValueOnce(timelinePage([]))
    expect(await controller.loadTimelineHistory('session', true)).toBe(false)
    expect(state().reActTimelines).toEqual([])
    expect(rawData.timelineBeforeId).toBe(0)
    expect(controller.hasMoreTimeline('session')).toBe(false)
    expect(state().timelinesLoading).toBe(false)
  })

  it.each([false, true])('restores history and pagination after a failed refresh (noMore=%s)', async (noMore) => {
    await start()
    const { rawData, store } = controller.ensureSession('session')
    rawData.timelineBeforeId = 10
    rawData.timelineNoMore = noMore
    store.setState({ reActTimelines: [timelineItem(1), timelineItem(10)] })
    let rejectPage!: (error: Error) => void
    vi.mocked(grpcQueryAIEvent).mockImplementationOnce(
      () =>
        new Promise((_, reject) => {
          rejectPage = reject
        }),
    )

    const pending = controller.loadTimelineHistory('session', true)
    expect(state().timelinesLoading).toBe(true)
    state().updateTimeLineItem(timelineItem(11))
    rejectPage(new Error('query failed'))

    await expect(pending).resolves.toBe(false)
    expect(state().reActTimelines.map(({ id }) => id)).toEqual([1, 10, 11])
    expect(rawData.timelineBeforeId).toBe(10)
    expect(rawData.timelineNoMore).toBe(noMore)
    expect(state().timelinesLoading).toBe(false)
    expect(yakitNotify).toHaveBeenCalledWith('error', i18n.t('AIRightPanel.timelineRefreshFailed', { ns: 'aiAgent' }))
  })

  it('keeps the cursor and existing items when loading older history without refresh', async () => {
    await start()
    const { rawData } = controller.ensureSession('session')
    rawData.timelineBeforeId = 10
    controller.ensureSession('session').store.setState({ reActTimelines: [timelineItem(10)] })
    vi.mocked(grpcQueryAIEvent).mockResolvedValueOnce(timelinePage([9, 8]))
    expect(await controller.loadTimelineHistory('session')).toBe(false)
    expect(grpcQueryAIEvent).toHaveBeenLastCalledWith(
      expect.objectContaining({ Pagination: expect.objectContaining({ BeforeId: 10 }) }),
      true,
    )
    expect(state().reActTimelines.map(({ id }) => id)).toEqual([8, 9, 10])
    expect(rawData.timelineBeforeId).toBe(8)
  })

  it('reports invalid JSON without closing the stream', async () => {
    const token = await start()
    send('dump-1')
    emit(token, response('dump-1', { Content: new TextEncoder().encode('{') }))
    await tick()
    expect(yakitNotify).toHaveBeenCalledWith('error', i18n.t('AIRightPanel.dumpFetchFailed', { ns: 'aiAgent' }))
    expect(write).not.toHaveBeenCalled()
    expect(controller.isSessionClosing('session')).toBe(false)
  })

  it('rejects late callbacks from the previous connection after the same session reconnects', async () => {
    const oldToken = await start()
    send('dump-1')
    await controller.handleSessionEnd('session')
    controller.handleStartSession({
      kind: 'resume',
      sessionId: 'session',
      route: YakitRoute.AI_Agent,
      pageId: 'page',
      params: { Params: { Source: 'ai' } },
    })
    await controller.ensureSession('session').meta.lifecycle.preparation
    const token = ipcRendererMock.invoke.mock.calls.filter(([method]) => method === 'start-ai-re-act').at(-1)![1]
    expect(token).not.toBe(oldToken)
    emit(token, makeGrpcJsonRes('pong', {}, { SessionId: 'session' }))
    await tick()
    emit(token, makeGrpcJsonRes('structured', { next_start_id: 0 }, { NodeId: 'recovery_history' }))
    await tick()
    expect(send('dump-2')).toBe(true)
    emit(oldToken, response('dump-1'))
    emit(oldToken, response('dump-2'))
    await tick()
    expect(write).not.toHaveBeenCalled()
    expect(controller.ensureSession('session').rawData.timelineDump).toBeUndefined()
    emit(token, response('dump-2'))
    await tick()
    expect(controller.ensureSession('session').rawData.timelineDump).toBe('  中文\n<tag>"\\</tag>  ')
  })

  it('uses the existing recovery pagination guard', async () => {
    await start()
    state().updateState({ grpcLoadMoreLoading: true })
    const calls = ipcRendererMock.invoke.mock.calls.length
    expect(send('dump-1')).toBe(false)
    expect(ipcRendererMock.invoke.mock.calls).toHaveLength(calls)
  })

  it('uses the shared send failure lifecycle', async () => {
    await start()
    const failure = new Error('send failed')
    ipcRendererMock.invoke.mockRejectedValueOnce(failure)
    expect(send('dump-1')).toBe(true)
    await tick()
    expect(controller.ensureSession('session').meta.lifecycle.error).toBe(failure)
    expect(controller.isSessionClosing('session')).toBe(true)
    expect(state().execute).toBe(false)
  })
})

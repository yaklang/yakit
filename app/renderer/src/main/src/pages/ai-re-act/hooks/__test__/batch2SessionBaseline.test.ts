import './setupElectron'
import { ipcRendererMock } from './setupElectron'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ChatMultiSessionController } from '../ChatMultiSessionController'
import { grpcQueryAIEvent } from '@/pages/ai-agent/grpc'
import { YakitRoute } from '@/enums/yakitRoute'
vi.mock('lottie-web', () => ({ default: vi.fn() }))
vi.mock('@/pages/yakRunner/utils', () => ({ isYaklangScriptDeliveryPath: vi.fn() }))
vi.mock('@/utils/notification', () => ({ yakitNotify: vi.fn() }))
vi.mock('@/pages/ai-agent/grpc', () => ({ grpcQueryAIEvent: vi.fn().mockResolvedValue({ Events: [], Total: 0 }) }))
vi.mock('../persist/aiChatPersistStore', () => ({
  default: {
    getSessionRender: vi.fn().mockResolvedValue(undefined),
    getSessionContents: vi.fn().mockResolvedValue([]),
    setSessionRender: vi.fn().mockResolvedValue(undefined),
    setSessionContent: vi.fn().mockResolvedValue(undefined),
    setSessionReference: vi.fn().mockResolvedValue(undefined),
    deleteSessionPersist: vi.fn().mockResolvedValue(undefined),
  },
}))
const tick = async () => {
  for (let i = 0; i < 35; i++) await Promise.resolve()
}
let ctrl: ChatMultiSessionController
beforeEach(() => {
  vi.useFakeTimers()
  vi.clearAllMocks()
  ipcRendererMock.invoke.mockResolvedValue(undefined)
  vi.mocked(grpcQueryAIEvent).mockResolvedValue({ Events: [], Total: 0 } as any)
  ctrl = new ChatMultiSessionController()
})
afterEach(async () => {
  await ctrl.handleSessionEnd('stable-session')
  vi.clearAllTimers()
  vi.useRealTimers()
})
describe('preserved AI Senso start contract', () => {
  it('sends the selected Forge, context/Goal settings and original attachments at startup', async () => {
    ctrl.handleStartSession({
      token: 'stable-session',
      route: YakitRoute.AI_Agent,
      pageId: 'page',
      params: {
        IsStart: true,
        Params: {
          Source: 'ai',
          TimelineSessionID: 'stable-session',
          UserQuery: 'first',
          ForgeName: 'senso-role-forge',
          RuntimeContextSizeLimit: 307200,
          SingleModelMode: true,
          Strategy: { EnableGoalMode: true, GoalAcceptanceCriteria: 'done' },
        },
        AttachedResourceInfo: [{ Key: 'file' as any, Type: 'path' as any, Value: 'allowed/file.txt' }],
      },
    })
    await tick()
    const call = ipcRendererMock.invoke.mock.calls.find(([name]) => name === 'start-ai-re-act')!
    expect(call[2]).toMatchObject({
      Params: {
        ForgeName: 'senso-role-forge',
        RuntimeContextSizeLimit: 307200,
        SingleModelMode: true,
        Strategy: { GoalAcceptanceCriteria: 'done' },
      },
      AttachedResourceInfo: expect.arrayContaining([{ Key: 'file', Type: 'path', Value: 'allowed/file.txt' }]),
    })
  })
  it('defers the first input until handshake and sends it exactly once', async () => {
    ctrl.handleStartSession({
      token: 'stable-session',
      route: YakitRoute.AI_Agent,
      pageId: 'page',
      params: { Params: { Source: 'ai', UserQuery: 'first' } },
    })
    await tick()
    expect(ipcRendererMock.invoke.mock.calls.filter(([, , p]) => p?.IsFreeInput)).toHaveLength(0)
    const startup = ipcRendererMock.invoke.mock.calls.find(([name]) => name === 'start-ai-re-act')!
    const handler = ipcRendererMock.on.mock.calls.find(([name]) => name === `${startup[1]}-data`)?.[1]
    const emit = async () => {
      if (handler) handler({}, { Type: 'pong', SessionId: 'stable-session', Content: new Uint8Array() })
      else await ctrl.handleGrpcOutputEvent('stable-session', { Type: 'pong', Content: new Uint8Array() } as any)
      await tick()
    }
    await emit()
    await emit()
    expect(ipcRendererMock.invoke.mock.calls.filter(([, , p]) => p?.IsFreeInput)).toHaveLength(1)
  })
  it('never starts a connection after cancellation during asynchronous preparation', async () => {
    let finish!: (value: any) => void
    vi.mocked(grpcQueryAIEvent).mockReturnValue(new Promise((resolve) => (finish = resolve)))
    ctrl.handleStartSession({
      token: 'stable-session',
      route: YakitRoute.AI_Agent,
      pageId: 'page',
      params: { Params: { Source: 'ai', UserQuery: '' } },
    })
    ctrl.forceCloseSession({ sessionIds: ['stable-session'] })
    await tick()
    finish({ Events: [], Total: 0 })
    await tick()
    expect(ipcRendererMock.invoke.mock.calls.filter(([name]) => name === 'start-ai-re-act')).toHaveLength(0)
  })
})

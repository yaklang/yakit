import './setupElectron'
import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AISession } from '@/pages/ai-agent/type/aiChat'
import type { AIHandleStartResProps } from '../../aiReActChat/AIReActChatType'
import { useStartAIChat } from '../useStartAIChat'
import { AttachedResourceKeyEnum, AttachedResourceTypeEnum } from '@/pages/ai-agent/defaultConstant'

const mocks = vi.hoisted(() => ({
  activeChat: undefined as AISession | undefined,
  onStart: vi.fn(),
  setActiveChat: vi.fn(),
  emit: vi.fn(),
  setting: { Source: 'ai', TimelineSessionID: 'stale-setting' },
}))
vi.mock('@/pages/ai-agent/useContext/useStore', () => ({ default: () => ({ activeChat: mocks.activeChat }) }))
vi.mock('@/pages/ai-agent/useContext/useDispatcher', () => ({
  default: () => ({ onStart: mocks.onStart, setActiveChat: mocks.setActiveChat, getSetting: () => mocks.setting }),
}))
vi.mock('@/pages/ai-agent/utils', () => ({
  createActiveChatSessionId: () => 'client-session',
  formatAIAgentSetting: (setting: unknown) => setting,
  getAIReActRequestParams: (value: any) => ({ attachedResourceInfo: value.attachedResourceInfo }),
}))
vi.mock('@/utils/eventBus/eventBus', () => ({ default: { emit: mocks.emit } }))

beforeEach(() => {
  vi.clearAllMocks()
  mocks.activeChat = undefined
  mocks.setting = { Source: 'ai', TimelineSessionID: 'stale-setting' }
})
afterEach(cleanup)

describe('submission identity', () => {
  it.each(['new', 'resume'] as const)(
    'preserves business preparation and only binds a new session: %s',
    async (kind) => {
      const onChat = vi.fn()
      const onSessionBound = vi.fn()
      const setMention = vi.fn()
      const resource = {
        Type: AttachedResourceTypeEnum.CONTEXT_PROVIDER_TYPE_FILE,
        Key: AttachedResourceKeyEnum.CONTEXT_PROVIDER_KEY_FILE_PATH,
        Value: '/image.png',
      }
      const startRequest = vi.fn(async ({ params }: { params: AIHandleStartResProps['params'] }) => ({
        params: { ...params, FocusModeLoop: 'prepared-focus', AttachedResourceInfo: [resource] },
        extraParams: { chatId: 'business-id' },
        onChat,
        onSessionBound,
      }))
      const { result } = renderHook(() => useStartAIChat({ startRequest, setMention }))
      // 配置在 render 之后更新，提交仍应读到最新值。
      mocks.setting = { Source: 'webFuzzer', TimelineSessionID: 'stale-setting' }
      await act(async () =>
        result.current({
          qs: 'hello',
          target: { kind, sessionId: kind === 'new' ? 'client-session' : 'history' },
        }),
      )
      const input = mocks.onStart.mock.calls[0][0]
      expect(input.params.AttachedResourceInfo).toEqual([resource])
      expect(input.params.Params.Source).toBe('webFuzzer')
      expect(input.params.Params.PreferSessionCachedConfig).toBe(kind === 'resume')
      expect(setMention).toHaveBeenCalledWith({
        mentionId: 'prepared-focus',
        mentionType: 'focusMode',
        mentionName: 'prepared-focus',
      })
      expect(onChat).toHaveBeenCalledTimes(kind === 'new' ? 1 : 0)
      const id = kind === 'new' ? 'client-session' : 'history'
      input.onLinkStart('stream-token')
      input.onLinkSuccess(id, true)
      if (kind === 'new') {
        expect(onSessionBound).toHaveBeenCalledExactlyOnceWith(id)
        expect(mocks.setActiveChat).toHaveBeenCalledWith(
          expect.objectContaining({
            Id: 'business-id',
            SessionID: id,
            viewKey: 'stream-token',
            Source: 'webFuzzer',
            StartParams: expect.objectContaining({ TimelineSessionID: id, UserQuery: '' }),
          }),
        )
        expect(onSessionBound.mock.invocationCallOrder[0]).toBeLessThan(mocks.setActiveChat.mock.invocationCallOrder[0])
      } else {
        expect(onSessionBound).not.toHaveBeenCalled()
        expect(mocks.setActiveChat).not.toHaveBeenCalled()
        expect(mocks.emit).not.toHaveBeenCalled()
      }
    },
  )

  it('falls back to the captured target when business preparation rejects after switching history', async () => {
    let reject!: (error: Error) => void
    const startRequest = vi.fn(
      () =>
        new Promise<AIHandleStartResProps>((_resolve, fail) => {
          reject = fail
        }),
    )
    const { result, rerender } = renderHook(() => useStartAIChat({ startRequest }))
    act(() => result.current({ qs: 'first', target: { kind: 'new', sessionId: 'client-session' } }))
    mocks.activeChat = { SessionID: 'other-history' } as AISession
    rerender()
    await act(async () => reject(new Error('prepare failed')))
    expect(mocks.onStart).toHaveBeenCalledTimes(1)
    expect(mocks.onStart.mock.calls[0][0]).toMatchObject({ kind: 'new', params: { Params: { UserQuery: 'first' } } })
    expect(mocks.onStart.mock.calls[0][0].params.Params.TimelineSessionID).toBe('client-session')
  })

  it('starts a welcome submission synchronously with a preallocated session ID, even when a history is selected', () => {
    mocks.activeChat = { SessionID: 'history' } as AISession
    const { result } = renderHook(() => useStartAIChat())
    act(() => result.current({ qs: 'hello', target: { kind: 'new', sessionId: 'image-draft' } }))
    const input = mocks.onStart.mock.calls[0][0]
    expect(input.kind).toBe('new')
    expect(input.sessionId).toBe('image-draft')
    expect(input.params.Params.TimelineSessionID).toBe('image-draft')
    expect(input.params.Params.PreferSessionCachedConfig).toBe(false)
  })

  it.each(['new', 'resume'] as const)(
    'keeps the %s target across asynchronous preparation and a view change',
    async (kind) => {
      let resolve!: (value: AIHandleStartResProps) => void
      const startRequest = vi.fn(
        ({ params }) =>
          new Promise<AIHandleStartResProps>((done) => {
            resolve = () => done({ params })
          }),
      )
      mocks.activeChat = kind === 'resume' ? ({ SessionID: 'original' } as AISession) : undefined
      const { result, rerender } = renderHook(() => useStartAIChat({ startRequest }))
      act(() =>
        result.current({ qs: 'hello', target: { kind, sessionId: kind === 'resume' ? 'original' : 'client-session' } }),
      )
      mocks.activeChat = { SessionID: 'other-history' } as AISession
      rerender()
      await act(async () => resolve({ params: {} }))
      const input = mocks.onStart.mock.calls[0][0]
      expect(input.kind).toBe(kind)
      expect(input.sessionId).toBe(kind === 'resume' ? 'original' : 'client-session')
      expect(input.params.Params.TimelineSessionID).toBe(kind === 'resume' ? 'original' : 'client-session')
    },
  )

  it('publishes a background session without changing selection, even after the submitting view unmounts', () => {
    const { result, unmount } = renderHook(() => useStartAIChat())
    act(() => result.current({ qs: 'first question', target: { kind: 'new', sessionId: 'client-session' } }))
    const input = mocks.onStart.mock.calls[0][0]
    input.onLinkStart('transport')
    unmount()
    input.onLinkSuccess('client-session', false)
    expect(mocks.setActiveChat).not.toHaveBeenCalled()
    const message = JSON.parse(mocks.emit.mock.calls[0][1])
    expect(message.type).toBe('prependSession')
    expect(message.payload).toMatchObject({
      SessionID: 'client-session',
      viewKey: 'transport',
      question: 'first question',
    })
  })

  it('activates a foreground session after binding', () => {
    const { result } = renderHook(() => useStartAIChat())
    act(() => result.current({ qs: 'hello', target: { kind: 'new', sessionId: 'client-session' } }))
    mocks.onStart.mock.calls[0][0].onLinkSuccess('client-session', true)
    expect(mocks.setActiveChat).toHaveBeenCalledWith(expect.objectContaining({ SessionID: 'client-session' }))
  })
})

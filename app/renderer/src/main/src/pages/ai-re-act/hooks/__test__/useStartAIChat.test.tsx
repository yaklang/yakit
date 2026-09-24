import './setupElectron'
import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AISession } from '@/pages/ai-agent/type/aiChat'
import type { AIHandleStartResProps } from '../../aiReActChat/AIReActChatType'
import { useStartAIChat } from '../useStartAIChat'

const mocks = vi.hoisted(() => ({
  activeChat: undefined as AISession | undefined,
  onStart: vi.fn(),
  setActiveChat: vi.fn(),
  emit: vi.fn(),
}))
vi.mock('@/pages/ai-agent/useContext/useStore', () => ({ default: () => ({ activeChat: mocks.activeChat }) }))
vi.mock('@/pages/ai-agent/useContext/useDispatcher', () => ({
  default: () => ({ onStart: mocks.onStart, setActiveChat: mocks.setActiveChat, getSetting: () => ({ Source: 'ai' }) }),
}))
vi.mock('@/pages/ai-agent/utils', () => ({
  formatAIAgentSetting: (setting: unknown) => setting,
  getAIReActRequestParams: (value: any) => ({ attachedResourceInfo: value.attachedResourceInfo }),
}))
vi.mock('@/utils/eventBus/eventBus', () => ({ default: { emit: mocks.emit } }))

beforeEach(() => {
  vi.clearAllMocks()
  mocks.activeChat = undefined
})
afterEach(cleanup)

describe('submission identity', () => {
  it('starts a welcome submission synchronously with no session ID, even when a history is selected', () => {
    mocks.activeChat = { SessionID: 'history' } as AISession
    const { result } = renderHook(() => useStartAIChat())
    act(() => result.current({ qs: 'hello', sessionId: 'image-draft', target: { kind: 'new' } }))
    const input = mocks.onStart.mock.calls[0][0]
    expect(input.kind).toBe('new')
    expect(input.sessionId).toBeUndefined()
    expect(input.draftId).toBe('image-draft')
    expect(input.params.Params.TimelineSessionID).toBeUndefined()
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
      act(() => result.current({ qs: 'hello' }))
      mocks.activeChat = { SessionID: 'other-history' } as AISession
      rerender()
      await act(async () => resolve({ params: {} }))
      const input = mocks.onStart.mock.calls[0][0]
      expect(input.kind).toBe(kind)
      expect(input.sessionId).toBe(kind === 'resume' ? 'original' : undefined)
      expect(input.params.Params.TimelineSessionID).toBe(kind === 'resume' ? 'original' : undefined)
    },
  )

  it('publishes a background session without changing selection, even after the submitting view unmounts', () => {
    const { result, unmount } = renderHook(() => useStartAIChat())
    act(() => result.current({ qs: 'first question', target: { kind: 'new' } }))
    const input = mocks.onStart.mock.calls[0][0]
    input.onLinkStart('transport')
    unmount()
    input.onLinkSuccess('backend-session', false)
    expect(mocks.setActiveChat).not.toHaveBeenCalled()
    const message = JSON.parse(mocks.emit.mock.calls[0][1])
    expect(message.type).toBe('prependSession')
    expect(message.payload).toMatchObject({
      SessionID: 'backend-session',
      viewKey: 'transport',
      question: 'first question',
    })
  })

  it('activates a foreground session after binding', () => {
    const { result } = renderHook(() => useStartAIChat())
    act(() => result.current({ qs: 'hello', target: { kind: 'new' } }))
    mocks.onStart.mock.calls[0][0].onLinkSuccess('backend-session', true)
    expect(mocks.setActiveChat).toHaveBeenCalledWith(expect.objectContaining({ SessionID: 'backend-session' }))
  })
})

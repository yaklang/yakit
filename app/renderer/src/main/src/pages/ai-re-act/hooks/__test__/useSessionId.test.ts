import { cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import useSessionId from '../useSessionId'

const mocks = vi.hoisted(() => ({
  activeChat: undefined as { SessionID: string } | undefined,
  createDraft: vi.fn(),
}))
vi.mock('@/pages/ai-agent/useContext/useStore', () => ({
  default: () => ({
    activeChat: mocks.activeChat,
    setting: { TimelineSessionID: 'stale-setting' },
  }),
}))
vi.mock('@/pages/ai-agent/utils', () => ({ createActiveChatSessionId: mocks.createDraft }))

beforeEach(() => {
  mocks.activeChat = undefined
  mocks.createDraft.mockReset().mockReturnValue('new-draft')
})
afterEach(cleanup)

it('欢迎页使用预分配 ID，上传图片时继续复用', () => {
  mocks.activeChat = { SessionID: 'welcome-session' }
  const { result } = renderHook(() => useSessionId())
  expect(result.current.getSession()).toBe('welcome-session')
  expect(result.current.getSession('old-image-draft')).toBe('welcome-session')
  expect(mocks.createDraft).not.toHaveBeenCalled()
})

it('uses a fallback ID without an active session and ignores a stale settings session ID', () => {
  const { result } = renderHook(() => useSessionId())
  expect(result.current.getSession('existing-draft')).toBe('existing-draft')
  expect(mocks.createDraft).not.toHaveBeenCalled()
  expect(result.current.getSession()).toBe('new-draft')
  expect(mocks.createDraft).toHaveBeenCalledTimes(1)
})

it('uses the selected session for images and falls back when the embedded page has no active session', () => {
  mocks.activeChat = { SessionID: 'history' }
  const { result, rerender } = renderHook(() => useSessionId())
  const getSession = result.current.getSession
  expect(getSession('draft')).toBe('history')
  mocks.activeChat = { SessionID: 'other-history' }
  rerender()
  expect(getSession('draft')).toBe('other-history')
  mocks.activeChat = undefined
  rerender()
  expect(getSession()).toBe('new-draft')
})

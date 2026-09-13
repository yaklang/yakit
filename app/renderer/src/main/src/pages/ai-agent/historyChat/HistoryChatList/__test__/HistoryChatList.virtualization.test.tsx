import React from 'react'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { VirtuosoMockContext } from 'react-virtuoso'
import { createStore } from 'zustand/vanilla'
import HistoryChatList from '../HistoryChatList'
import type { AISession } from '../../../type/aiChat'
import { AISessionDeleteCancelledError } from '../../utils'

const mocks = vi.hoisted(() => ({
  setActiveChat: vi.fn(),
  setSetting: vi.fn(),
  ensureSession: vi.fn(),
  setSessions: vi.fn(),
  removeSession: vi.fn(),
  updateTitle: vi.fn(),
  notify: vi.fn(),
  newChat: vi.fn(),
}))
vi.mock('../../../useContext/useStore', () => ({ default: () => ({ setting: { Source: 'ai' } }) }))
vi.mock('../../../useContext/useDispatcher', () => ({ default: () => mocks }))
vi.mock('@/i18n/useI18nNamespaces', () => ({ useI18nNamespaces: () => ({ t: (key: string) => key }) }))
vi.mock('../../../defaultConstant', () => ({ YakitAIAgentPageID: 'ai-agent' }))
vi.mock('../../../UtilModals', () => ({
  EditChatNameModal: ({
    visible,
    info,
    onCallback,
  }: {
    visible: boolean
    info: AISession
    onCallback: (ok: boolean, info: AISession) => void
  }) => (visible ? <button onClick={() => onCallback(true, { ...info, Title: 'Renamed' })}>Save title</button> : null),
}))
vi.mock('../../../grpc', () => ({ grpcUpdateAISessionTitle: mocks.updateTitle }))
vi.mock('../../HistoryChat', () => ({ onNewChat: mocks.newChat }))
vi.mock('../../utils', () => ({
  handAIHistoryChatRemove: mocks.removeSession,
  AISessionDeleteCancelledError: class extends Error {},
}))
vi.mock('@/utils/notification', () => ({ yakitNotify: mocks.notify }))
vi.mock('@/pages/ai-re-act/hooks/useCurrentSessionId', () => ({ default: () => '' }))
vi.mock('@/pages/ai-re-act/hooks/useGetChatDataStoreKey', () => ({
  default: () => 'aiChatDataStore',
  AI_AGENT_HISTORY_AI_SOURCES: ['ai', 'im', ''],
}))
vi.mock('@/pages/ai-re-act/hooks/grpcApi', () => ({
  AITaskStatus: { inProgress: 'inProgress' },
  AISourceEnum: { aiAgent: 'ai', im: 'im', other: '' },
}))
vi.mock('@/pages/ai-re-act/hooks/ChatMultiSessionController', () => ({
  globalSessionEngine: { ensureSession: mocks.ensureSession, getSessionExecute: () => false },
}))

const makeSessionState = () => {
  const store = createStore(() => ({ currentChatStatus: { status: 'idle' } }))
  const subscribe = store.subscribe
  const unsubscribers: ReturnType<typeof vi.fn>[] = []
  store.subscribe = vi.fn((listener) => {
    const unsubscribe = vi.fn(subscribe(listener))
    unsubscribers.push(unsubscribe)
    return unsubscribe
  })
  return { store, unsubscribers }
}
const sessionStates = new Map<string, ReturnType<typeof makeSessionState>>()

const sessions = Array.from({ length: 1960 }, (_, index) => ({
  SessionID: `session-${index}`,
  Title: `Session ${index}`,
  Source: 'ai',
  UpdatedAt: Math.floor(Date.now() / 1000) - index * 3600,
})) as AISession[]
const view = (search = '', data = sessions) => (
  <VirtuosoMockContext.Provider value={{ viewportHeight: 480, itemHeight: 32 }}>
    <HistoryChatList search={search} sessionList={data} aiSource={['ai']} setSessions={mocks.setSessions} embedded />
  </VirtuosoMockContext.Provider>
)

beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(() => ({
      matches: false,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  })
})
beforeEach(() => {
  vi.clearAllMocks()
  sessionStates.clear()
  mocks.removeSession.mockResolvedValue(undefined)
  mocks.updateTitle.mockResolvedValue(undefined)
  mocks.ensureSession.mockImplementation((id: string) => {
    if (!sessionStates.has(id)) sessionStates.set(id, makeSessionState())
    return sessionStates.get(id)
  })
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

const rowFor = (title: string) => screen.getByText(title).parentElement!.parentElement!
const deleteButtonFor = (title: string) => within(rowFor(title)).getAllByRole('button')[1]

describe('HistoryChatList viewport rendering', () => {
  it('bounds mounted rows and session subscriptions for 1960 sessions', async () => {
    render(view())
    expect(await screen.findByText('Session 0')).toBeInTheDocument()
    expect(screen.queryByText('Session 1959')).not.toBeInTheDocument()
    expect(screen.getAllByText(/^Session \d+$/).length).toBeLessThan(40)
    expect(mocks.ensureSession.mock.calls.length).toBeLessThan(40)
    expect(screen.getByText('HistoryChatList.justNow')).toBeInTheDocument()
  })

  it('searches all history, including a session outside the initial viewport, and selects the correct row', async () => {
    const { rerender } = render(view())
    await screen.findByText('Session 0')
    rerender(view('Session 1959'))
    fireEvent.click(await screen.findByText('Session 1959'))
    expect(mocks.setActiveChat).toHaveBeenCalledWith(sessions[1959])
    expect(screen.queryByText('Session 0')).not.toBeInTheDocument()
    rerender(view())
    await waitFor(() => expect(screen.getByText('Session 0')).toBeInTheDocument())
  })

  it('handles empty history and a search with no matches without allocating session state', () => {
    const { rerender } = render(view('', []))
    expect(screen.queryByText(/^Session \d+$/)).not.toBeInTheDocument()
    expect(mocks.ensureSession).not.toHaveBeenCalled()
    rerender(view('no such session'))
    expect(screen.queryByText(/^Session \d+$/)).not.toBeInTheDocument()
    expect(mocks.ensureSession).not.toHaveBeenCalled()
  })

  it('releases subscriptions when a row leaves the filtered viewport and keeps session stores isolated', async () => {
    const data = sessions.slice(0, 2)
    const { rerender, unmount } = render(view('', data))
    await screen.findByText('Session 0')
    const first = sessionStates.get(data[0].SessionID)!
    const second = sessionStates.get(data[1].SessionID)!
    expect(first.store).not.toBe(second.store)
    const originalSubscriptions = [...first.unsubscribers]
    expect(originalSubscriptions.length).toBeGreaterThan(0)
    act(() => first.store.setState({ currentChatStatus: { status: 'inProgress' } }))
    expect(second.store.getState().currentChatStatus.status).toBe('idle')
    rerender(view('Session 1', data))
    await waitFor(() => expect(screen.queryByText('Session 0')).not.toBeInTheDocument())
    expect(originalSubscriptions.every((unsubscribe) => unsubscribe.mock.calls.length === 1)).toBe(true)
    rerender(view('', data))
    await screen.findByText('Session 0')
    expect(sessionStates.get(data[0].SessionID)).toBe(first)
    expect(first.store.getState().currentChatStatus.status).toBe('inProgress')
    unmount()
    expect([...sessionStates.values()].flatMap((s) => s.unsubscribers).every((fn) => fn.mock.calls.length === 1)).toBe(
      true,
    )
  })

  it('keeps a pending rename attached to its original session after reordering and filtering', async () => {
    const data = sessions.slice(0, 2)
    const { rerender } = render(view('', data))
    await screen.findByText('Session 0')
    fireEvent.click(within(rowFor('Session 0')).getAllByRole('button')[0])
    expect(mocks.setActiveChat).not.toHaveBeenCalled()
    rerender(view('Session 1', [...data].reverse()))
    fireEvent.click(await screen.findByRole('button', { name: 'Save title' }))
    await waitFor(() =>
      expect(mocks.updateTitle).toHaveBeenCalledWith({ SessionID: data[0].SessionID, Title: 'Renamed' }),
    )
    const update = mocks.setSessions.mock.calls[0][0]
    expect(update(data)).toEqual([{ ...data[0], Title: 'Renamed' }, data[1]])
    expect(mocks.setActiveChat).not.toHaveBeenCalled()
  })

  it('requires confirmation and deletes only the selected session after reordering', async () => {
    const data = sessions.slice(0, 2)
    const { rerender } = render(view('', data))
    await screen.findByText('Session 0')
    rerender(view('', [...data].reverse()))
    fireEvent.click(deleteButtonFor('Session 0'))
    expect(mocks.removeSession).not.toHaveBeenCalled()
    fireEvent.click(await screen.findByRole('button', { name: 'YakitButton.cancel' }))
    expect(mocks.removeSession).not.toHaveBeenCalled()
    expect(mocks.setActiveChat).not.toHaveBeenCalled()
    fireEvent.click(deleteButtonFor('Session 0'))
    fireEvent.click(await screen.findByRole('button', { name: 'YakitButton.ok' }))
    await waitFor(() => expect(mocks.setSessions).toHaveBeenCalledWith([data[1]]))
    expect(mocks.removeSession).toHaveBeenCalledExactlyOnceWith({
      grpcDeleteAISessionParams: { Filter: { SessionID: [data[0].SessionID], Source: ['ai'] } },
      handleClearAIImageParams: { chatDataStoreKey: 'aiChatDataStore', sessionID: [data[0].SessionID] },
      deleteSessionsParams: { sessionIds: [data[0].SessionID], source: [] },
    })
    expect(mocks.setActiveChat).not.toHaveBeenCalled()
  })

  it.each([
    ['cancelled', 1],
    ['failed', 1],
    ['cancelled', 2],
    ['failed', 2],
  ] as const)(
    'preserves history when deletion is %s with %i sessions without an unhandled rejection',
    async (reason, count) => {
      const data = sessions.slice(0, count)
      mocks.removeSession.mockRejectedValueOnce(
        reason === 'cancelled' ? new AISessionDeleteCancelledError() : new Error('offline'),
      )
      render(view('', data))
      await screen.findByText('Session 0')
      fireEvent.click(deleteButtonFor('Session 0'))
      fireEvent.click(await screen.findByRole('button', { name: 'YakitButton.ok' }))
      await waitFor(() => expect(mocks.setSessions).toHaveBeenCalledWith(data))
      expect(screen.getByText('Session 0')).toBeInTheDocument()
      if (count > 1) expect(screen.getByText('Session 1')).toBeInTheDocument()
      expect(mocks.setActiveChat).not.toHaveBeenCalled()
      expect(mocks.newChat).not.toHaveBeenCalled()
      if (reason === 'cancelled') expect(mocks.notify).not.toHaveBeenCalled()
      else expect(mocks.notify).toHaveBeenCalledWith('error', 'HistoryChatList.deleteFailed')
    },
  )

  it('opens a new chat only after the last session has actually been deleted', async () => {
    let finishDelete!: () => void
    mocks.removeSession.mockReturnValueOnce(
      new Promise<void>((resolve) => {
        finishDelete = resolve
      }),
    )
    render(view('', sessions.slice(0, 1)))
    await screen.findByText('Session 0')
    fireEvent.click(deleteButtonFor('Session 0'))
    fireEvent.click(await screen.findByRole('button', { name: 'YakitButton.ok' }))
    expect(mocks.newChat).not.toHaveBeenCalled()
    expect(mocks.setSessions).not.toHaveBeenCalled()
    await act(async () => finishDelete())
    await waitFor(() => expect(mocks.setSessions).toHaveBeenCalledWith([]))
    expect(mocks.newChat).toHaveBeenCalledTimes(1)
  })

  it('renders untrusted long titles as text and separates session keys from date group keys', async () => {
    const errors = vi.spyOn(console, 'error')
    const title = '<img src=x onerror=alert(1)><script>alert(1)</script>' + '历史'.repeat(4096)
    const data = [{ ...sessions[0], SessionID: 'group:justNow', Title: title }, sessions[1]]
    const { container, rerender } = render(view('', data))
    expect(await screen.findByText(title)).toHaveAttribute('title', title)
    expect(container.querySelector('img, script, iframe')).toBeNull()
    rerender(view('', [...data].reverse()))
    fireEvent.click(screen.getByText(title))
    expect(mocks.setActiveChat).toHaveBeenCalledWith(data[0])
    expect(errors.mock.calls.some((args) => args.some((value) => String(value).includes('same key')))).toBe(false)
  })
})

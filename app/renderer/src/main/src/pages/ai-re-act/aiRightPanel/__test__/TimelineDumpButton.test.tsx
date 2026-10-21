import type { PropsWithChildren } from 'react'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createStore } from 'zustand/vanilla'
import type { ChatStoreState } from '../../hooks/aiRender'
import { TimelineDumpButton } from '../TimelineDumpButton'

const mocks = vi.hoisted(() => ({
  sessionId: 'session-a',
  send: vi.fn(),
  write: vi.fn(),
  notify: vi.fn(),
  loadTimeline: vi.fn(),
}))
type State = Pick<
  ChatStoreState,
  | 'execute'
  | 'initLoading'
  | 'grpcLoadMoreLoading'
  | 'syncIDUpdate'
  | 'timelineDumpUpdate'
  | 'timelinesLoading'
  | 'updateStateCount'
>
const rawData: { timelineDump?: string } = {}
const meta = { syncIDMap: new Map<string, boolean>() }
const store = createStore<State>((set) => ({
  execute: true,
  initLoading: false,
  grpcLoadMoreLoading: false,
  syncIDUpdate: 0,
  timelineDumpUpdate: 0,
  timelinesLoading: false,
  updateStateCount: (type) => set((state) => ({ [type]: (state[type as keyof State] as number) + 1 })),
}))
vi.mock('../../hooks/ChatMultiSessionController', () => ({
  globalSessionEngine: { loadTimelineHistory: mocks.loadTimeline },
}))
vi.mock('../../hooks/useCurrentDataBySession', () => ({
  useCurrentStore: () => store,
  useCurrentMeta: () => meta,
  useCurrentRawData: () => rawData,
}))
vi.mock('../../hooks/useCurrentSessionId', () => ({ default: () => mocks.sessionId }))
vi.mock('@/pages/ai-agent/useContext/useDispatcher', () => ({ default: () => ({ onSend: mocks.send }) }))
vi.mock('@/services/electronBridge', () => ({ yakitClipboard: { setText: mocks.write } }))
vi.mock('@/utils/notification', () => ({ yakitNotify: mocks.notify }))
vi.mock('@/i18n/useI18nNamespaces', () => ({ useI18nNamespaces: () => ({ t: (key: string) => key }) }))
vi.mock('antd', () => ({ Tooltip: ({ children }: PropsWithChildren) => children }))
vi.mock('@/components/yakitUI/YakitButton/YakitButton', () => ({
  YakitButton: ({
    children,
    loading,
    disabled,
    onClick,
    'aria-label': label,
  }: PropsWithChildren<{ loading: boolean; disabled?: boolean; onClick: () => void; 'aria-label'?: string }>) => (
    <button disabled={disabled || loading} onClick={onClick} aria-label={label}>
      {children}
    </button>
  ),
}))

const button = () => screen.getByRole('button', { name: 'AIRightPanel.copyDump' })
const refreshButton = () => screen.getByRole('button', { name: 'YakitButton.refresh' })
const updateDump = (dump: string | undefined) => {
  act(() => {
    rawData.timelineDump = dump
    store.getState().updateStateCount('timelineDumpUpdate')
  })
}
const receiveReceipt = () => {
  const syncId = mocks.send.mock.lastCall![0].params.SyncID
  act(() => {
    meta.syncIDMap.delete(syncId)
    store.getState().updateStateCount('syncIDUpdate')
  })
}
const clickCopy = async () => {
  await act(async () => fireEvent.click(button()))
  act(() => vi.advanceTimersByTime(500))
}

describe('TimelineDumpButton', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.resetAllMocks()
    mocks.sessionId = 'session-a'
    meta.syncIDMap.clear()
    rawData.timelineDump = undefined
    store.setState({
      execute: true,
      initLoading: false,
      grpcLoadMoreLoading: false,
      syncIDUpdate: 0,
      timelineDumpUpdate: 0,
      timelinesLoading: false,
    })
    mocks.write.mockResolvedValue(undefined)
    mocks.send.mockImplementation(({ params }) => {
      meta.syncIDMap.set(params.SyncID, true)
      store.getState().updateStateCount('syncIDUpdate')
      return true
    })
  })
  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  it('fetches once on opening, waits for the sync receipt and copies cached data without sending again', async () => {
    const { rerender } = render(<TimelineDumpButton />)
    const syncId = mocks.send.mock.lastCall![0].params.SyncID
    expect(mocks.send).toHaveBeenCalledWith({
      token: 'session-a',
      type: '',
      params: { IsSyncMessage: true, SyncType: 'timeline', SyncID: syncId, SyncJsonInput: '{"limit":50}' },
    })
    act(() => vi.advanceTimersByTime(300))
    expect(button()).toBeEnabled()
    expect(mocks.write).not.toHaveBeenCalled()
    updateDump('  中文\n<tag>"\\</tag>  ')
    receiveReceipt()
    expect(button()).toBeEnabled()
    await clickCopy()
    expect(mocks.write).toHaveBeenCalledWith(rawData.timelineDump)
    expect(mocks.notify).toHaveBeenCalledWith('success', 'AIRightPanel.dumpCopied')
    updateDump('updated dump')
    await clickCopy()
    expect(mocks.write).toHaveBeenLastCalledWith('updated dump')
    rerender(<TimelineDumpButton />)
    expect(mocks.send).toHaveBeenCalledTimes(1)
    expect(mocks.loadTimeline).not.toHaveBeenCalled()
  })

  it('refreshes both dump and timeline and copies the updated dump', async () => {
    render(<TimelineDumpButton />)
    const firstId = mocks.send.mock.lastCall![0].params.SyncID
    updateDump('old dump')
    receiveReceipt()
    act(() => vi.advanceTimersByTime(300))
    fireEvent.click(refreshButton())
    expect(mocks.send).toHaveBeenCalledTimes(2)
    expect(mocks.send.mock.lastCall![0].params.SyncID).not.toBe(firstId)
    expect(mocks.loadTimeline).toHaveBeenCalledWith('session-a', true)
    expect(refreshButton()).toBeDisabled()
    updateDump('new dump')
    receiveReceipt()
    act(() => vi.advanceTimersByTime(300))
    await clickCopy()
    expect(mocks.write).toHaveBeenCalledWith('new dump')
    expect(mocks.send).toHaveBeenCalledTimes(2)
  })

  it('disables refresh while timeline history is loading', () => {
    render(<TimelineDumpButton />)
    receiveReceipt()
    act(() => vi.advanceTimersByTime(300))
    act(() => store.setState({ timelinesLoading: true }))
    expect(refreshButton()).toBeDisabled()
    fireEvent.click(refreshButton())
    expect(mocks.loadTimeline).not.toHaveBeenCalled()
    expect(mocks.send).toHaveBeenCalledTimes(1)
    act(() => store.setState({ timelinesLoading: false }))
    expect(refreshButton()).toBeEnabled()
  })

  it('fetches a fresh dump each time the window opens', () => {
    const { unmount } = render(<TimelineDumpButton />)
    const firstId = mocks.send.mock.lastCall![0].params.SyncID
    unmount()
    render(<TimelineDumpButton />)
    expect(mocks.send).toHaveBeenCalledTimes(2)
    expect(mocks.send.mock.lastCall![0].params.SyncID).not.toBe(firstId)
  })

  it('does not send again when history loading finishes while the window stays open', () => {
    render(<TimelineDumpButton />)
    act(() => store.setState({ grpcLoadMoreLoading: true }))
    act(() => store.setState({ grpcLoadMoreLoading: false }))
    expect(mocks.send).toHaveBeenCalledTimes(1)
  })

  it.each([{ execute: false }, { initLoading: true }, { grpcLoadMoreLoading: true }])(
    'waits until the connection is ready before fetching: %j',
    (state) => {
      store.setState(state)
      render(<TimelineDumpButton />)
      expect(mocks.send).not.toHaveBeenCalled()
      act(() => store.setState({ execute: true, initLoading: false, grpcLoadMoreLoading: false }))
      expect(mocks.send).toHaveBeenCalledTimes(1)
    },
  )

  it('fetches for the new session when switching sessions', () => {
    const { rerender } = render(<TimelineDumpButton />)
    mocks.sessionId = 'session-b'
    rerender(<TimelineDumpButton />)
    expect(mocks.send).toHaveBeenCalledTimes(2)
    expect(mocks.send.mock.lastCall![0].token).toBe('session-b')
  })

  it('copies cached data even when the session is disconnected', async () => {
    store.setState({ execute: false })
    rawData.timelineDump = 'cached dump'
    render(<TimelineDumpButton />)
    await clickCopy()
    expect(mocks.write).toHaveBeenCalledWith('cached dump')
    expect(mocks.send).not.toHaveBeenCalled()
    expect(refreshButton()).toBeDisabled()
  })

  it.each([
    ['', 'info', 'dumpEmpty'],
    [undefined, 'warning', 'dumpUnsupported'],
  ])('does not overwrite the clipboard for %j', async (dump, level, message) => {
    store.setState({ execute: false })
    rawData.timelineDump = dump
    render(<TimelineDumpButton />)
    await act(async () => fireEvent.click(button()))
    expect(mocks.notify).toHaveBeenCalledWith(level, `AIRightPanel.${message}`)
    expect(mocks.write).not.toHaveBeenCalled()
    expect(button()).toBeDisabled()
    act(() => vi.advanceTimersByTime(499))
    expect(button()).toBeDisabled()
    act(() => vi.advanceTimersByTime(1))
    expect(button()).toBeEnabled()
  })

  it.each([false, true])('keeps copy loading for 500ms after copying, including failure: %j', async (fails) => {
    store.setState({ execute: false })
    rawData.timelineDump = 'cached dump'
    if (fails) mocks.write.mockRejectedValueOnce(new Error('clipboard failed'))
    render(<TimelineDumpButton />)
    await act(async () => fireEvent.click(button()))
    expect(button()).toBeDisabled()
    fireEvent.click(button())
    expect(mocks.write).toHaveBeenCalledTimes(1)
    act(() => vi.advanceTimersByTime(499))
    expect(button()).toBeDisabled()
    act(() => vi.advanceTimersByTime(1))
    expect(button()).toBeEnabled()
  })

  it('reports clipboard failure', async () => {
    store.setState({ execute: false })
    rawData.timelineDump = 'cached dump'
    mocks.write.mockRejectedValueOnce(new Error('clipboard failed'))
    render(<TimelineDumpButton />)
    await clickCopy()
    expect(mocks.notify).toHaveBeenCalledWith('error', 'AIRightPanel.dumpCopyFailed')
  })
})

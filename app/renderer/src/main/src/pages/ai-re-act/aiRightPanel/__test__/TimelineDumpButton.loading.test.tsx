import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createStore } from 'zustand/vanilla'
import { TimelineDumpButton } from '../TimelineDumpButton'

const mocks = vi.hoisted(() => ({
  dump: undefined as string | undefined,
  dumpLoading: false,
  write: vi.fn(),
  notify: vi.fn(),
}))
const store = createStore(() => ({ timelinesLoading: false }))

vi.mock('../../hooks/useCurrentDataBySession', () => ({ useCurrentStore: () => store }))
vi.mock('../../hooks/useCurrentSessionId', () => ({ default: () => 'session-a' }))
vi.mock('../../hooks/ChatMultiSessionController', () => ({
  globalSessionEngine: { loadTimelineHistory: vi.fn() },
}))
vi.mock('../../hooks/useTimelineDump', () => ({
  useTimelineDump: () => ({ dump: mocks.dump, loading: mocks.dumpLoading, ready: false, refreshDump: vi.fn() }),
}))
vi.mock('@/services/electronBridge', () => ({ yakitClipboard: { setText: mocks.write } }))
vi.mock('@/utils/notification', () => ({ yakitNotify: mocks.notify }))
vi.mock('@/i18n/useI18nNamespaces', () => ({ useI18nNamespaces: () => ({ t: (key: string) => key }) }))

describe('TimelineDumpButton loading with the real YakitButton', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.resetAllMocks()
    mocks.dump = undefined
    mocks.dumpLoading = false
    mocks.write.mockResolvedValue(undefined)
  })

  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  it.each([
    { dump: 'cached dump', fails: false },
    { dump: 'cached dump', fails: true },
    { dump: '', fails: false },
    { dump: undefined, fails: false },
  ])('uses the default loading icon and clears loading 500ms after handling the click: %j', async ({ dump, fails }) => {
    mocks.dump = dump
    if (fails) mocks.write.mockRejectedValueOnce(new Error('clipboard failed'))
    render(<TimelineDumpButton />)
    const button = screen.getByRole('button', { name: 'AIRightPanel.copyDump' })

    await act(async () => fireEvent.click(button))
    expect(button).toHaveClass('ant-btn-loading')
    expect(button.querySelector('.ant-btn-loading-icon .anticon-loading')).toBeVisible()
    fireEvent.click(button)
    expect(mocks.notify).toHaveBeenCalledTimes(1)

    act(() => vi.advanceTimersByTime(499))
    expect(button).toHaveClass('ant-btn-loading')
    act(() => vi.advanceTimersByTime(1))
    expect(button).not.toHaveClass('ant-btn-loading')
  })

  it('keeps copy loading independent of dump refresh loading', async () => {
    mocks.dump = 'cached dump'
    mocks.dumpLoading = true
    render(<TimelineDumpButton />)
    const copyButton = screen.getByRole('button', { name: 'AIRightPanel.copyDump' })
    const refreshButton = screen.getByRole('button', { name: 'YakitButton.refresh' })

    expect(copyButton).not.toHaveClass('ant-btn-loading')
    expect(refreshButton).toHaveClass('ant-btn-loading')
    await act(async () => fireEvent.click(copyButton))
    expect(mocks.write).toHaveBeenCalledWith('cached dump')
    expect(copyButton).toHaveClass('ant-btn-loading')

    act(() => vi.advanceTimersByTime(500))
    expect(copyButton).not.toHaveClass('ant-btn-loading')
    expect(refreshButton).toHaveClass('ant-btn-loading')
  })

  it('waits for the clipboard operation to finish before starting the 500ms delay', async () => {
    mocks.dump = 'cached dump'
    let resolveCopy!: () => void
    mocks.write.mockReturnValueOnce(
      new Promise<void>((resolve) => {
        resolveCopy = resolve
      }),
    )
    render(<TimelineDumpButton />)
    const button = screen.getByRole('button', { name: 'AIRightPanel.copyDump' })

    fireEvent.click(button)
    act(() => vi.advanceTimersByTime(500))
    expect(button).toHaveClass('ant-btn-loading')
    expect(mocks.notify).not.toHaveBeenCalled()
    fireEvent.click(button)
    expect(mocks.write).toHaveBeenCalledTimes(1)

    await act(async () => resolveCopy())
    expect(mocks.notify).toHaveBeenCalledWith('success', 'AIRightPanel.dumpCopied')
    act(() => vi.advanceTimersByTime(499))
    expect(button).toHaveClass('ant-btn-loading')
    act(() => vi.advanceTimersByTime(1))
    expect(button).not.toHaveClass('ant-btn-loading')
  })
})

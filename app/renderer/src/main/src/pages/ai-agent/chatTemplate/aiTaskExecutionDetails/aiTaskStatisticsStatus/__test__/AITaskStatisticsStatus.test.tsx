import React from 'react'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AITaskStatisticsStatus } from '../AITaskStatisticsStatus'
import { TODO_STATUS_FILTER_KEYS } from '../../taskStatusUtils'
vi.mock('@/i18n/useI18nNamespaces', () => ({ useI18nNamespaces: () => ({ t: (key: string) => key }) }))
const list = ['created', ...TODO_STATUS_FILTER_KEYS].map((key) => ({
  key,
  title: key,
  footerLeft: key === 'created' ? 5 : 1,
  color: 'neutral' as const,
}))
const button = (key: string) => screen.getByText(key).closest('[role="button"]') as HTMLElement
export const transfer = () => {
  const values: Record<string, string> = {}
  return {
    effectAllowed: '',
    setData: (type: string, value: string) => {
      values[type] = value
    },
    getData: (type: string) => values[type] || '',
    files: [],
    items: [],
  }
}
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.useRealTimers()
})
describe('native status controls', () => {
  it('toggles by click, Enter and Space and exposes visible state', () => {
    const toggle = vi.fn()
    const { rerender } = render(<AITaskStatisticsStatus list={list} onToggle={toggle} onReorder={vi.fn()} />)
    fireEvent.click(button('pending'))
    fireEvent.keyDown(button('doing'), { key: 'Enter' })
    fireEvent.keyDown(button('done'), { key: ' ' })
    expect(toggle.mock.calls.map((call) => call[0])).toEqual(['pending', 'doing', 'done'])
    rerender(<AITaskStatisticsStatus list={list} hiddenKeys={['pending']} onToggle={toggle} onReorder={vi.fn()} />)
    expect(button('pending')).toHaveAttribute('aria-pressed', 'false')
    expect(button('doing')).toHaveAttribute('aria-pressed', 'true')
  })
  it('makes total a non-draggable filter and reflects all hidden statuses', () => {
    render(
      <AITaskStatisticsStatus
        list={list}
        hiddenKeys={[...TODO_STATUS_FILTER_KEYS]}
        onToggle={vi.fn()}
        onReorder={vi.fn()}
      />,
    )
    expect(button('created')).not.toHaveAttribute('draggable')
    expect(button('created')).toHaveAttribute('aria-pressed', 'false')
    expect(button('pending')).toHaveAttribute('draggable', 'true')
  })
  it('uses real drag listeners, reorders on drop and suppresses the trailing browser click', () => {
    vi.useFakeTimers()
    const reorder = vi.fn(),
      toggle = vi.fn()
    render(<AITaskStatisticsStatus list={list} onToggle={toggle} onReorder={reorder} />)
    const dataTransfer = transfer()
    fireEvent.dragStart(button('doing'), { dataTransfer })
    fireEvent.dragEnter(button('pending'), { dataTransfer })
    fireEvent.drop(button('pending'), { dataTransfer })
    fireEvent.dragEnd(button('doing'), { dataTransfer })
    expect(dataTransfer.effectAllowed).toBe('move')
    expect(reorder).toHaveBeenCalledWith('doing', 'pending')
    fireEvent.click(button('doing'))
    expect(toggle).not.toHaveBeenCalled()
    act(() => {
      vi.runOnlyPendingTimers()
    })
    fireEvent.click(button('doing'))
    expect(toggle).toHaveBeenCalledWith('doing')
  })
  it('supports adjacent keyboard reorder without toggling filters and ignores boundaries', () => {
    const reorder = vi.fn(),
      toggle = vi.fn()
    render(<AITaskStatisticsStatus list={list} onToggle={toggle} onReorder={reorder} />)
    fireEvent.keyDown(button('doing'), { altKey: true, key: 'ArrowLeft' })
    expect(reorder).not.toHaveBeenCalled()
    fireEvent.keyDown(button('doing'), { altKey: true, key: 'ArrowRight' })
    expect(reorder).toHaveBeenCalledWith('doing', 'pending')
    expect(toggle).not.toHaveBeenCalled()
  })
  it('ignores unrecognized, external and same-item drag payloads', () => {
    const reorder = vi.fn()
    render(<AITaskStatisticsStatus list={list} onToggle={vi.fn()} onReorder={reorder} />)
    const dataTransfer = transfer()
    for (const value of [
      'broken',
      JSON.stringify({ key: 'doing' }),
      JSON.stringify({ key: 'doing', scope: 'another-panel' }),
    ]) {
      dataTransfer.setData('custom', value)
      fireEvent.drop(button('pending'), { dataTransfer })
    }
    fireEvent.dragStart(button('pending'), { dataTransfer })
    fireEvent.drop(button('pending'), { dataTransfer })
    expect(reorder).not.toHaveBeenCalled()
  })
  it('cancels click-release timers on unmount and allows cancelled drags to be clicked again', () => {
    vi.useFakeTimers()
    const toggle = vi.fn()
    const { unmount } = render(<AITaskStatisticsStatus list={list} onToggle={toggle} onReorder={vi.fn()} />)
    const dataTransfer = transfer()
    fireEvent.dragStart(button('done'), { dataTransfer })
    fireEvent.dragEnd(button('done'), { dataTransfer })
    act(() => {
      vi.runOnlyPendingTimers()
    })
    fireEvent.click(button('done'))
    expect(toggle).toHaveBeenCalledWith('done')
    const schedule = vi.spyOn(window, 'setTimeout')
    fireEvent.dragStart(button('done'), { dataTransfer })
    fireEvent.dragEnd(button('done'), { dataTransfer })
    const releaseId = schedule.mock.results[schedule.mock.results.length - 1].value
    const cancel = vi.spyOn(window, 'clearTimeout')
    unmount()
    expect(cancel).toHaveBeenCalledWith(releaseId)
  })
  it('remains read-only when callbacks are absent', () => {
    const { container } = render(<AITaskStatisticsStatus list={list} />)
    expect(screen.queryAllByRole('button')).toHaveLength(0)
    expect(container.querySelector('[draggable]')).toBeNull()
  })
})

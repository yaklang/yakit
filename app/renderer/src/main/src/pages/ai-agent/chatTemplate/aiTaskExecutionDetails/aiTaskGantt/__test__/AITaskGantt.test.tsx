import React from 'react'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AITaskGantt } from '../AITaskGantt'
import type { AITaskGanttTodoItem } from '../type'

vi.mock('@/i18n/useI18nNamespaces', () => ({ useI18nNamespaces: () => ({ t: (key: string) => key }) }))
const base = 1750000000
const item = (data: Partial<AITaskGanttTodoItem> = {}): AITaskGanttTodoItem => ({
  id: 'a',
  content: 'Task A',
  status: 'DOING',
  created_at: 1,
  updated_at: 2,
  created_ts: base,
  focus_started_ts: base + 10,
  ...data,
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('read-only task Gantt', () => {
  it('retains every status row and marks missing real time without fabricating bars', () => {
    const { container } = render(
      <AITaskGantt
        items={['PENDING', 'DOING', 'DONE', 'SKIPPED', 'DELETED'].map((status, i) =>
          item({ id: `${i}`, content: status, status: status as AITaskGanttTodoItem['status'], created_ts: undefined }),
        )}
      />,
    )
    expect(screen.getAllByRole('button')).toHaveLength(5)
    expect(screen.getAllByText('AITaskGantt.noTime')).toHaveLength(5)
    expect(container.querySelectorAll('.bar-segment')).toHaveLength(0)
    expect(screen.getAllByText('AITaskExecutionDetails.statusDeleted').length).toBeGreaterThan(0)
  })
  it('supports keyboard selection, preserves a long name in accessible text, and toggles selection', () => {
    const content = 'Long task '.repeat(10)
    render(<AITaskGantt items={[item({ content })]} />)
    const row = screen.getByRole('button', { name: `${content}: AITaskExecutionDetails.statusDoing` })
    fireEvent.keyDown(row, { key: 'Enter' })
    expect(row).toHaveAttribute('aria-pressed', 'true')
    fireEvent.keyDown(row, { key: ' ' })
    expect(row).toHaveAttribute('aria-pressed', 'false')
  })
  it('extends only active tasks every five seconds and releases the timer on unmount', () => {
    vi.useFakeTimers()
    vi.setSystemTime((base + 50) * 1000)
    const { container, rerender, unmount } = render(<AITaskGantt items={[item()]} />)
    const segment = () => container.querySelector('.bar-segment-execute') as HTMLElement
    const width = segment().style.width
    act(() => {
      vi.advanceTimersByTime(5000)
    })
    expect(segment().style.width).not.toBe(width)
    rerender(<AITaskGantt items={[item({ status: 'DONE', closed_ts: base + 60 })]} />)
    const closedWidth = segment().style.width
    act(() => {
      vi.advanceTimersByTime(15000)
    })
    expect(segment().style.width).toBe(closedWidth)
    unmount()
    expect(vi.getTimerCount()).toBe(0)
  })
  it('renders an empty time window and normalizes millisecond rows', () => {
    const { container, rerender } = render(<AITaskGantt items={[]} />)
    expect(container.querySelectorAll('.timeline-tick')).toHaveLength(5)
    rerender(<AITaskGantt items={[item({ created_ts: base * 1000, status: 'DONE', closed_ts: (base + 60) * 1000 })]} />)
    expect(container.querySelector('.bar-segment-success')).toBeInTheDocument()
    expect(container.querySelectorAll('.timeline-tick').length).toBeLessThanOrEqual(9)
  })
})

it('orders and toggles legends by status without deleting timeline phases from visible rows', () => {
  const toggle = vi.fn()
  const { container } = render(
    <AITaskGantt
      items={[item({ status: 'DOING' })]}
      hiddenLegendKinds={['wait']}
      legendKindOrder={['success', 'wait', 'execute', 'skipped', 'failed']}
      onLegendToggle={toggle}
    />,
  )
  expect(container.querySelector('.bar-segment-wait')).toBeInTheDocument()
  const legend = screen.getByRole('button', { name: 'AITaskExecutionDetails.statusPending' })
  expect(legend).toHaveAttribute('aria-pressed', 'false')
  fireEvent.keyDown(legend, { key: ' ' })
  expect(toggle).toHaveBeenCalledWith('wait')
  expect(Array.from(container.querySelectorAll('.gantt-legend .legend-item')).map((x) => x.textContent)).toEqual([
    'AITaskExecutionDetails.statusDone',
    'AITaskExecutionDetails.statusPending',
    'AITaskExecutionDetails.statusDoing',
    'AITaskExecutionDetails.statusSkipped',
    'AITaskExecutionDetails.statusDeleted',
  ])
})

import React from 'react'
import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import '../../../../../ai-re-act/hooks/__test__/setupElectron'
import type { TodoListCardData } from '@/pages/ai-re-act/hooks/aiRender'

vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({
    t: (key: string, params?: { time?: string }) => (params?.time ? `${key}: ${params.time}` : key),
  }),
}))
vi.mock('@/utils/timeUtil', () => ({ formatTime: (seconds: number) => `time:${seconds}` }))
import { AITaskBoardView } from '../AITaskBoardView'

type Item = TodoListCardData['items'][number]
const make = (id: string, status: string, rest: Partial<Item> = {}) =>
  ({ id, status, content: id, created_at: 1, updated_at: 2, ...rest }) as Item
afterEach(cleanup)

describe('read-only official task board adapted to AI Senso', () => {
  it('shows the four status columns with skipped and deleted cards retained', () => {
    render(
      <AITaskBoardView
        items={[
          make('queued', 'PENDING'),
          make('working', 'DOING'),
          make('finished', 'DONE'),
          make('skipped', 'SKIPPED'),
          make('deleted', 'DELETED'),
        ]}
      />,
    )
    expect(within(screen.getByRole('list', { name: 'AITaskBoard.PENDING' })).getByText('queued')).toBeInTheDocument()
    expect(
      within(screen.getByRole('list', { name: 'AITaskBoard.SKIPPED_DELETED' })).getAllByRole('listitem'),
    ).toHaveLength(2)
    expect(screen.getAllByRole('listitem')).toHaveLength(5)
    expect(screen.queryAllByRole('button')).toHaveLength(0)
    expect(screen.queryAllByRole('textbox')).toHaveLength(0)
    expect(screen.getAllByRole('listitem').every((card) => card.getAttribute('draggable') !== 'true')).toBe(true)
  })

  it('renders empty columns without fake task cards', () => {
    render(<AITaskBoardView items={[]} />)
    expect(screen.getAllByText('AITaskBoard.emptyColumn')).toHaveLength(4)
    expect(screen.queryAllByRole('listitem')).toHaveLength(0)
  })

  it('does not turn sequence counters into timestamps or queued time into execution duration', () => {
    render(
      <AITaskBoardView
        items={[
          make('done without clock', 'DONE'),
          make('duration', 'DONE', { focus_seconds: 66, focus_started_ts: 1700000000000, closed_ts: 1700000066 }),
        ]}
      />,
    )
    expect(screen.getByText('AITaskExecutionDetails.duration: 1m6s')).toBeInTheDocument()
    expect(screen.getByText('AITaskExecutionDetails.duration: —')).toBeInTheDocument()
    expect(screen.queryByText(/time:1$/)).not.toBeInTheDocument()
    expect(screen.getByText(/time:1700000000/)).toBeInTheDocument()
  })

  it('reflects in-place stream changes even when the task item object is reused', () => {
    const task = make('step', 'DOING', { focus_seconds: 1 })
    const { rerender } = render(<AITaskBoardView items={[task]} />)
    expect(within(screen.getByRole('list', { name: 'AITaskBoard.DOING' })).getByText('step')).toBeInTheDocument()
    task.status = 'DONE'
    task.focus_seconds = 66
    rerender(<AITaskBoardView items={[task]} />)
    expect(within(screen.getByRole('list', { name: 'AITaskBoard.DONE' })).getByText('step')).toBeInTheDocument()
    expect(screen.getByText('AITaskExecutionDetails.duration: 1m6s')).toBeInTheDocument()
    expect(within(screen.getByRole('list', { name: 'AITaskBoard.DOING' })).queryAllByRole('listitem')).toHaveLength(0)
  })
})

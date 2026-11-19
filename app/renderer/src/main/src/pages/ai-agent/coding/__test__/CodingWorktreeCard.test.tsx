import React from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { WorktreeProgressCard } from '../CodingWorktreeCard'

vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({ t: (key: string) => key.split('.').at(-1) }),
}))
vi.mock('../../useContext/useStore', () => ({ default: () => ({}) }))
vi.mock('../../useContext/useDispatcher', () => ({ default: () => ({}) }))
afterEach(cleanup)

describe('worktree conversation card', () => {
  it('expands during checkout, collapses on ready and can reopen the details', () => {
    const progress = {
      stage: 'checkout' as const,
      path: '/repo/worktree',
      base_ref: 'origin/main',
      base_commit: 'abc123',
    }
    const { rerender } = render(<WorktreeProgressCard progress={progress} />)
    expect(screen.getByRole('button', { name: 'creating' })).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText('checkout')).toBeVisible()
    rerender(<WorktreeProgressCard progress={{ ...progress, stage: 'ready' }} />)
    expect(screen.getByRole('button', { name: 'ready' })).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByText('checkout')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'ready' }))
    fireEvent.click(screen.getByRole('button', { name: 'details' }))
    expect(screen.getByText(/Commit: abc123/)).toBeVisible()
  })

  it('keeps failures expanded with retry and cancel actions', () => {
    const retry = vi.fn(),
      cancel = vi.fn()
    render(
      <WorktreeProgressCard
        progress={{ stage: 'failed', failed_stage: 'checkout', error: 'disk full' }}
        onRetry={retry}
        onCancel={cancel}
      />,
    )
    expect(screen.getByRole('alert')).toHaveTextContent('disk full')
    expect(screen.getByRole('button', { name: 'failed' })).toHaveAttribute('aria-expanded', 'true')
    fireEvent.click(screen.getByRole('button', { name: 'retry' }))
    fireEvent.click(screen.getByRole('button', { name: 'cancel' }))
    expect(retry).toHaveBeenCalledTimes(1)
    expect(cancel).toHaveBeenCalledTimes(1)
  })

  it('reopens an already-created worktree if conversation startup fails', () => {
    const { rerender } = render(<WorktreeProgressCard progress={{ stage: 'ready' }} />)
    rerender(<WorktreeProgressCard progress={{ stage: 'ready' }} startError="connection closed" />)
    expect(screen.getByRole('button', { name: 'startFailed' })).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('alert')).toHaveTextContent('connection closed')
  })
})

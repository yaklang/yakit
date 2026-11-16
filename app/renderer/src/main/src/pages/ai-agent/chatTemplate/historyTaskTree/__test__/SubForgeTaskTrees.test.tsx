import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { SubForgeRunTree, SubForgeTaskTrees } from '../SubForgeTaskTrees'
import { createStore } from 'zustand/vanilla'
import { useCurrentStore } from '@/pages/ai-re-act/hooks/useCurrentDataBySession'
import { AITaskStatus } from '@/pages/ai-re-act/hooks/grpcApi'
import { mergeSubForgeRun } from '@/pages/ai-re-act/hooks/subForgeTaskTree'
import type { SubForgeRun } from '@/pages/ai-re-act/hooks/subForgeTaskTree'

vi.mock('@/pages/ai-re-act/hooks/useCurrentDataBySession', () => ({ useCurrentStore: vi.fn() }))
const run: SubForgeRun = {
  parent_coordinator_id: 'parent',
  parent_task_id: 'task',
  parent_task_uuid: 'attempt',
  call_tool_id: 'call',
  child_coordinator_id: 'child',
  tool_name: 'inventory',
  revision: 2,
  status: 'running',
  historical: false,
  task_tree: {
    name: 'Inventory',
    subtasks: [
      { task_id: 'read', name: 'Read evidence', progress: 'completed' },
      { task_id: 'verify', name: 'Verify evidence', progress: 'processing' },
    ],
  },
}

describe('nested Forge display', () => {
  it('does not revive an interrupted snapshot on equal-revision history or a new coordinator', () => {
    const store = createStore(() => ({
      execute: true,
      currentChatStatus: { coordinatorId: 'parent', status: AITaskStatus.inProgress },
      subForgeRuns: { child: run },
    }))
    vi.mocked(useCurrentStore).mockReturnValue(store as unknown as ReturnType<typeof useCurrentStore>)
    const { container } = render(<SubForgeTaskTrees coordinatorId="parent" taskId="task" level={3} />)
    expect(container.querySelector('[data-status="processing"]')).toBeInTheDocument()
    act(() => store.setState({ execute: false }))
    expect(container.querySelector('[data-status="processing"]')).not.toBeInTheDocument()
    act(() =>
      store.setState({
        execute: true,
        currentChatStatus: { coordinatorId: 'next-parent', status: AITaskStatus.inProgress },
        subForgeRuns: { child: mergeSubForgeRun(run, run, true) },
      }),
    )
    expect(container.querySelector('[data-status="running"]')).not.toBeInTheDocument()
    expect(container.querySelector('[data-status="unknown"]')).toBeInTheDocument()
    expect(container.querySelector('[data-status="completed"]')).toBeInTheDocument()
  })
  it('renders each node state and is read-only', () => {
    const { container } = render(<SubForgeRunTree active={true} run={run} />)
    expect(screen.getByText('Read evidence')).toBeInTheDocument()
    expect(screen.getByText('Verify evidence')).toBeInTheDocument()
    expect(screen.getByText('Inventory').parentElement?.querySelector('[data-status]')).toBeNull()
    expect(container.querySelector('[data-status="completed"]')).toBeInTheDocument()
    expect(container.querySelector('[data-status="processing"]')).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    fireEvent.click(container.querySelector('summary')!)
    expect(container.querySelector('details')).not.toHaveAttribute('open')
  })
  it('preserves a collapsed run when a node status updates', () => {
    const { container, rerender } = render(<SubForgeRunTree active={true} run={run} />)
    fireEvent.click(container.querySelector('summary')!)
    rerender(<SubForgeRunTree active={true} run={{ ...run, revision: 3, status: 'succeeded' }} />)
    expect(container.querySelector('details')).not.toHaveAttribute('open')
    fireEvent.click(container.querySelector('summary')!)
    expect(container.querySelector('details')).toHaveAttribute('open')
    expect(screen.getByText('Read evidence')).toBeVisible()
    expect(container.querySelector('[data-status="processing"]')).not.toBeInTheDocument()
  })
  it('freezes live snapshots after the parent stops without overwriting a received terminal state', () => {
    const { container, rerender } = render(<SubForgeRunTree active={true} run={run} />)
    expect(container.querySelector('[data-status="processing"]')).toBeInTheDocument()
    rerender(<SubForgeRunTree active={false} run={run} />)
    expect(container.querySelector('[data-status="running"]')).not.toBeInTheDocument()
    expect(container.querySelector('[data-status="processing"]')).not.toBeInTheDocument()
    expect(container.querySelector('[data-status="unknown"]')).toBeInTheDocument()
    expect(container.querySelector('[data-status="completed"]')).toBeInTheDocument()
    rerender(<SubForgeRunTree active={false} run={{ ...run, status: 'cancelled' }} />)
    expect(container.querySelector('[data-status="cancelled"]')).toBeInTheDocument()
  })
  it('does not show an interrupted historical run as still processing', () => {
    const { container } = render(<SubForgeRunTree active={true} run={{ ...run, historical: true }} />)
    expect(container.querySelector('[data-status="unknown"]')).toBeInTheDocument()
    expect(container.querySelector('[data-status="processing"]')).not.toBeInTheDocument()
    expect(container.querySelector('[data-status="completed"]')).toBeInTheDocument()
  })
  it.each(['failed', 'cancelled', 'timed_out'] as const)('retains final %s without a false running node', (status) => {
    const { container } = render(<SubForgeRunTree active={true} run={{ ...run, status }} />)
    expect(container.querySelector(`[data-status="${status}"]`)).toBeInTheDocument()
    expect(container.querySelector('[data-status="processing"]')).not.toBeInTheDocument()
  })
})

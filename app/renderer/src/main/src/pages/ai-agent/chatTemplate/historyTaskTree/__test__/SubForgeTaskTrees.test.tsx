import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { SubForgeRunTree } from '../SubForgeTaskTrees'
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
  it('renders each node state and is read-only', () => {
    const { container } = render(<SubForgeRunTree run={run} />)
    expect(screen.getByText('Read evidence')).toBeInTheDocument()
    expect(screen.getByText('Verify evidence')).toBeInTheDocument()
    expect(screen.getByText('Inventory').parentElement?.querySelector('[data-status]')).toBeNull()
    expect(container.querySelector('[data-status="completed"]')).toBeInTheDocument()
    expect(container.querySelector('[data-status="processing"]')).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    fireEvent.click(container.querySelector('summary')!)
    expect(container.querySelector('details')).not.toHaveAttribute('open')
  })
  it('does not show an interrupted historical run as still processing', () => {
    const { container } = render(<SubForgeRunTree run={{ ...run, historical: true }} />)
    expect(container.querySelector('[data-status="unknown"]')).toBeInTheDocument()
    expect(container.querySelector('[data-status="processing"]')).not.toBeInTheDocument()
    expect(container.querySelector('[data-status="completed"]')).toBeInTheDocument()
  })
  it.each(['failed', 'cancelled', 'timed_out'] as const)('retains final %s without a false running node', (status) => {
    const { container } = render(<SubForgeRunTree run={{ ...run, status }} />)
    expect(container.querySelector(`[data-status="${status}"]`)).toBeInTheDocument()
    expect(container.querySelector('[data-status="processing"]')).not.toBeInTheDocument()
  })
})

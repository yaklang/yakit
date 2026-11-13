import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { HistoryTaskTreeItem } from '../HistoryTaskTree'
import type { HistoryTaskTreeItemProps } from '../HistoryTaskTreeType'

vi.mock('../../../aiTree/AITree', () => ({
  AITree: ({ aiTreeTitleExtraNode, renderTaskChildren, tasks }: any) => (
    <div>
      {aiTreeTitleExtraNode && <button>Resume parent</button>}
      {tasks.map((task: any) => (
        <div key={task.task_id}>
          {task.name}
          {renderTaskChildren(task)}
        </div>
      ))}
    </div>
  ),
}))
vi.mock('../SubForgeTaskTrees', () => ({ SubForgeTaskTrees: () => <div>Child Forge tree</div> }))
const item = {
  coordinator_id: 'parent',
  created_at_unix: 0,
  task_progress: { phase: 'Completed' },
  task_tree: [{ task_id: 'task', name: 'Parent task', level: 1 }],
} as HistoryTaskTreeItemProps['item']

describe('completed parent history', () => {
  it('shows parent and child details without adding a resume action', () => {
    render(<HistoryTaskTreeItem item={item} taskType="history" currentCoordinatorId="current" />)
    expect(screen.getByText('Parent task')).toBeInTheDocument()
    expect(screen.getByText('Child Forge tree')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Resume parent' })).not.toBeInTheDocument()
  })
  it('preserves resume actions for unfinished parent histories', () => {
    render(
      <HistoryTaskTreeItem
        item={{ ...item, task_progress: { ...item.task_progress, phase: 'NotCompleted' } }}
        taskType="history"
        currentCoordinatorId="current"
      />,
    )
    expect(screen.getByRole('button', { name: 'Resume parent' })).toBeInTheDocument()
  })
})

import React from 'react'
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { createStore } from 'zustand/vanilla'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '../../ai-re-act/hooks/__test__/setupElectron'

const SessionScope = React.createContext('session-a')
const fixture = vi.hoisted(() => ({ raw: { taskDetailsMap: new Map<string, any>() } }))
let chatStore = createStore(() => ({ currentChatStatus: { questionID: 'task-a' }, chatTodoListUpdate: 0 }))
vi.mock('@/pages/ai-re-act/hooks/useCurrentDataBySession', () => ({
  useCurrentRawData: () => fixture.raw,
  useCurrentStore: () => chatStore,
}))
vi.mock('@/pages/ai-re-act/hooks/useCurrentSessionId', () => ({ default: () => React.useContext(SessionScope) }))
vi.mock('@/i18n/useI18nNamespaces', () => ({ useI18nNamespaces: () => ({ t: (key: string) => key }) }))
vi.mock('@/components/yakitUI/YakitModal/YakitModal', () => ({
  YakitModal: ({ visible, children, title }: any) =>
    visible ? (
      <div role="dialog" aria-label={title}>
        {children}
      </div>
    ) : null,
}))
vi.mock('@/components/yakitUI/YakitButton/YakitButton', () => ({
  YakitButton: ({ children, onClick }: any) => <button onClick={onClick}>{children}</button>,
}))
vi.mock('@/pages/ai-agent/chatTemplate/aiTaskExecutionDetails/aiTaskBoard/AITaskBoardView', () => ({
  AITaskBoardView: ({ items }: any) => (
    <div>
      {items.map((item: any) => (
        <p key={item.id}>
          {item.content}: {item.status}
        </p>
      ))}
    </div>
  ),
}))

import { DigitalEmployeeTaskProgress } from '../DigitalEmployeeTaskProgress'

const taskData = (content: string, status = 'PENDING') => ({
  todoList: { items: [{ id: content, content, status, created_at: 1, updated_at: 2 }] },
})
beforeEach(() => {
  fixture.raw = {
    taskDetailsMap: new Map([
      ['task-a', taskData('A step')],
      ['task-b', taskData('B step')],
    ]),
  }
  chatStore = createStore(() => ({ currentChatStatus: { questionID: 'task-a' }, chatTodoListUpdate: 0 }))
})
afterEach(cleanup)

describe('digital employee task board entry and session isolation', () => {
  it('keeps the existing progress list and opens the current real task in a board', () => {
    render(<DigitalEmployeeTaskProgress />)
    expect(screen.getByText('A step')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'AITaskBoard.openBoard' }))
    expect(within(screen.getByRole('dialog')).getByText('A step: PENDING')).toBeInTheDocument()
    expect(screen.queryByText('B step: PENDING')).not.toBeInTheDocument()
  })

  it('refreshes the open board from the normal todo stream update signal', () => {
    render(<DigitalEmployeeTaskProgress />)
    fireEvent.click(screen.getByRole('button', { name: 'AITaskBoard.openBoard' }))
    fixture.raw.taskDetailsMap.get('task-a').todoList.items[0].status = 'DONE'
    act(() => chatStore.setState({ chatTodoListUpdate: 1 }))
    expect(within(screen.getByRole('dialog')).getByText('A step: DONE')).toBeInTheDocument()
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1')
  })

  it('closes the old task board on question changes and then displays only the new task', () => {
    render(<DigitalEmployeeTaskProgress />)
    fireEvent.click(screen.getByRole('button', { name: 'AITaskBoard.openBoard' }))
    act(() => chatStore.setState({ currentChatStatus: { questionID: 'task-b' } }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.queryByText('A step')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'AITaskBoard.openBoard' }))
    expect(within(screen.getByRole('dialog')).getByText('B step: PENDING')).toBeInTheDocument()
  })

  it('closes the open board when the session changes even if task IDs are identical', () => {
    const { rerender } = render(
      <SessionScope.Provider value="session-a">
        <DigitalEmployeeTaskProgress />
      </SessionScope.Provider>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'AITaskBoard.openBoard' }))
    fixture.raw = { taskDetailsMap: new Map([['task-a', taskData('B own step')]]) }
    rerender(
      <SessionScope.Provider value="session-b">
        <DigitalEmployeeTaskProgress />
      </SessionScope.Provider>,
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.queryByText('A step')).not.toBeInTheDocument()
    expect(screen.getByText('B own step')).toBeInTheDocument()
  })

  it('keeps deleted tasks inspectable without changing the existing progress completion metric', () => {
    fixture.raw.taskDetailsMap.set('task-a', taskData('deleted step', 'DELETED'))
    render(<DigitalEmployeeTaskProgress />)
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'AITaskBoard.openBoard' }))
    expect(within(screen.getByRole('dialog')).getByText('deleted step: DELETED')).toBeInTheDocument()
  })

  it('keeps the empty state when the current task has no todo list', () => {
    fixture.raw.taskDetailsMap.clear()
    render(<DigitalEmployeeTaskProgress />)
    expect(screen.getByText('等待执行步骤')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'AITaskBoard.openBoard' })).not.toBeInTheDocument()
  })
})

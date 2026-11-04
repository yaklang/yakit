import React from 'react'
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createStore } from 'zustand/vanilla'
import cloneDeep from 'lodash/cloneDeep'
import '../../../../ai-re-act/hooks/__test__/setupElectron'

const fixture = vi.hoisted(() => ({ raw: { taskDetailsMap: new Map<string, any>() }, id: 'session-a', send: vi.fn() }))
let chatStore = createStore(() => ({ chatTodoListUpdate: 0 }))
vi.mock('@/pages/ai-re-act/hooks/useCurrentDataBySession', () => ({
  useCurrentRawData: () => fixture.raw,
  useCurrentStore: () => chatStore,
}))
vi.mock('@/pages/ai-re-act/hooks/useCurrentSessionId', () => ({ default: () => fixture.id }))
vi.mock('@/pages/ai-agent/useContext/useDispatcher', () => ({ default: () => ({ onSend: fixture.send }) }))
vi.mock('@/i18n/useI18nNamespaces', () => ({ useI18nNamespaces: () => ({ t: (key: string) => key }) }))
vi.mock('@/components/yakitUI/YakitSwitch/yakitSwitchAnimation.scss', () => ({}))
vi.mock('@/components/yakitUI/YakitCheckbox/yakitCheckBoxAnimation.scss', () => ({}))
vi.mock('lottie-web', () => ({ default: vi.fn() }))
vi.mock('@/components/RollingLoadList/RollingLoadList', () => ({ RollingLoadList: () => null }))
vi.mock('@/pages/ai-re-act/aiReActChat/aiToDoList/AIToDoList', () => ({
  AIToDoListItem: ({ item }: any) => <div>{item.content}</div>,
}))
vi.mock('@/pages/ai-re-act/aiReActChat/aiToDoList/AIToDoListDetail', () => ({ AIToDoListDetail: () => null }))
vi.mock('@/pages/plugins/operator/horizontalScrollCard/HorizontalScrollCard', () => ({
  HorizontalScrollCardItemInfoMultiple: () => null,
  HorizontalScrollCardItemInfoSingle: () => null,
}))
vi.mock('@/components/TableTotalAndSelectNumber/TableTotalAndSelectNumber', () => ({
  TableTotalAndSelectNumber: () => null,
}))
vi.mock('@/components/yakitUI/YakitEmpty/YakitEmpty', () => ({ YakitEmpty: ({ title }: any) => <div>{title}</div> }))
vi.mock('@/pages/ai-agent/grpc', () => ({ grpcQueryAIForge: vi.fn() }))
vi.mock('@/pages/ai-agent/aiToolList/utils', () => ({ grpcGetAIToolList: vi.fn() }))
vi.mock('@/pages/plugins/utils', () => ({ apiQueryYakScript: vi.fn() }))
vi.mock('@/pages/ai-agent/aiMCP/utils', () => ({ grpcGetAllMCPServers: vi.fn() }))

import { DefaultPlanItemDetailsData } from '@/pages/ai-re-act/hooks/defaultConstant'
import { AITaskExecutionDetails } from '../AITaskExecutionDetails'

const task = (id: string) => {
  const data = cloneDeep(DefaultPlanItemDetailsData)
  data.taskId = id
  data.uuid = `${id}-1`
  data.todoList.items = [{ id, content: `${id} step`, status: 'PENDING', created_at: 1, updated_at: 2 }]
  return data
}
beforeEach(() => {
  fixture.send.mockReset()
  fixture.id = 'session-a'
  fixture.raw = {
    taskDetailsMap: new Map([
      ['A', task('A')],
      ['B', task('B')],
    ]),
  }
  chatStore = createStore(() => ({ chatTodoListUpdate: 0, taskDetailsUpdate: 0, sessionTaskList: [] }))
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({ matches: false, addListener: vi.fn(), removeListener: vi.fn() })),
  )
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('task details list / board integration', () => {
  it('defaults to the existing list, switches to the board, and retains the list option', () => {
    render(<AITaskExecutionDetails taskId="A" />)
    expect(screen.getByText('A step')).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'AITaskBoard.title' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('radio', { name: 'AITaskBoard.board' }))
    expect(within(screen.getByRole('region', { name: 'AITaskBoard.title' })).getByText('A step')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('radio', { name: 'AITaskBoard.list' }))
    expect(screen.getByText('A step')).toBeInTheDocument()
  })

  it('refreshes the selected board immediately from todo update signals', () => {
    render(<AITaskExecutionDetails taskId="A" />)
    fireEvent.click(screen.getByRole('radio', { name: 'AITaskBoard.board' }))
    fixture.raw.taskDetailsMap.get('A').uuid = 'A-2'
    fixture.raw.taskDetailsMap.get('A').todoList.items[0].status = 'DONE'
    act(() => chatStore.setState({ chatTodoListUpdate: 1 }))
    expect(within(screen.getByRole('list', { name: 'AITaskBoard.DONE' })).getByText('A step')).toBeInTheDocument()
  })

  it('resets the view on task changes and clears stale cards when the task disappears', () => {
    const { rerender } = render(<AITaskExecutionDetails taskId="A" />)
    fireEvent.click(screen.getByRole('radio', { name: 'AITaskBoard.board' }))
    rerender(<AITaskExecutionDetails taskId="B" />)
    expect(screen.queryByText(/A step/)).not.toBeInTheDocument()
    expect(screen.getByText('B step')).toBeInTheDocument()
    fixture.raw.taskDetailsMap.delete('B')
    act(() => chatStore.setState({ chatTodoListUpdate: 1 }))
    expect(screen.queryByText('B step')).not.toBeInTheDocument()
    expect(screen.getByText('暂无待办任务')).toBeInTheDocument()
  })
})

describe('task selection and Gantt integration', () => {
  const choose = (name: string) => {
    fireEvent.click(screen.getByRole('button', { name: 'AITaskExecutionDetails.selectTask' }))
    fireEvent.click(screen.getByRole('menuitem', { name }))
  }
  it('retains the initial task as a return destination before any detail snapshot exists', () => {
    fixture.raw = { taskDetailsMap: new Map() }
    chatStore.setState({ sessionTaskList: [{ task_id: 'C', task_name: 'Task C' }] } as any)
    render(<AITaskExecutionDetails taskId="A" taskName="Original A" taskGoal="Goal A" />)
    choose('Task C')
    expect(screen.queryByText('Goal A')).not.toBeInTheDocument()
    choose('Original A')
    expect(screen.getByText('Goal A')).toBeInTheDocument()
  })
  it('switches within the session, requests the official task snapshot, and clears the initial goal', () => {
    render(<AITaskExecutionDetails taskId="A" taskName="Original A" taskGoal="Goal A" />)
    choose('B')
    expect(fixture.send).toHaveBeenCalledWith(
      expect.objectContaining({
        token: 'session-a',
        params: expect.objectContaining({
          IsSyncMessage: true,
          SyncType: 'task_snapshot_sync',
          SyncJsonInput: JSON.stringify({ task_id: 'B' }),
          SyncID: expect.any(String),
        }),
      }),
    )
    expect(screen.getByText('B step')).toBeInTheDocument()
    expect(screen.queryByText('Goal A')).not.toBeInTheDocument()
    expect(screen.queryByText('A step')).not.toBeInTheDocument()
    choose('Original A')
    expect(screen.getByText('Goal A')).toBeInTheDocument()
  })
  it('retains selection on failed sends and permits retry', () => {
    fixture.send.mockReturnValueOnce(false)
    render(<AITaskExecutionDetails taskId="A" />)
    choose('B')
    expect(screen.getByText('A step')).toBeInTheDocument()
    choose('B')
    expect(screen.getByText('B step')).toBeInTheDocument()
  })
  it('keeps the selected task when another task receives a late update and refreshes on snapshot signals', () => {
    render(<AITaskExecutionDetails taskId="A" taskGoal="Goal A" />)
    choose('B')
    fixture.raw.taskDetailsMap.get('A').uuid = 'late-A'
    fixture.raw.taskDetailsMap.get('A').perception.summary = 'Late A perception'
    act(() => chatStore.setState({ taskDetailsUpdate: 1 } as any))
    expect(screen.getByText('B step')).toBeInTheDocument()
    expect(screen.queryByText('Late A perception')).not.toBeInTheDocument()
    fixture.raw.taskDetailsMap.get('B').uuid = 'new-B'
    fixture.raw.taskDetailsMap.get('B').perception.summary = 'B perception'
    act(() => chatStore.setState({ taskDetailsUpdate: 2 } as any))
    expect(screen.getByText('B perception')).toBeInTheDocument()
  })
  it('selects tasks that only exist in the session index and stays empty until their snapshot arrives', () => {
    chatStore.setState({ sessionTaskList: [{ task_id: 'C', task_name: 'Task C' }] } as any)
    render(<AITaskExecutionDetails taskId="A" taskName="Original A" />)
    choose('Task C')
    expect(screen.getByText('暂无待办任务')).toBeInTheDocument()
    expect(screen.queryByText('A step')).not.toBeInTheDocument()
    fixture.raw.taskDetailsMap.set('C', task('C'))
    act(() => chatStore.setState({ taskDetailsUpdate: 1 } as any))
    expect(screen.getByText('C step')).toBeInTheDocument()
    // 同一选择也能再次请求，允许错误回包后重试。
    choose('Task C')
    expect(fixture.send).toHaveBeenCalledTimes(2)
  })
  it('adds Gantt without changing the default list and resets selection on session changes', () => {
    const { rerender } = render(<AITaskExecutionDetails taskId="A" />)
    fireEvent.click(screen.getByRole('radio', { name: 'AITaskGantt.title' }))
    expect(screen.getByRole('region', { name: 'AITaskGantt.title' })).toBeInTheDocument()
    choose('B')
    fixture.id = 'session-b'
    fixture.raw = { taskDetailsMap: new Map([['A', task('A')]]) }
    rerender(<AITaskExecutionDetails taskId="A" taskName="Session B task" />)
    expect(screen.getByText('A step')).toBeInTheDocument()
    expect(screen.queryByText('B step')).not.toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'AITaskGantt.title' })).not.toBeInTheDocument()
  })
})

describe('B3-C shared filters and status display order', () => {
  const stat = (key: string) =>
    within(document.querySelector('.stats-overview') as HTMLElement)
      .getByText(
        key === 'created'
          ? 'AITaskStatusControls.created'
          : `AITaskExecutionDetails.status${key[0].toUpperCase()}${key.slice(1)}`,
      )
      .closest('[role="button"]') as HTMLElement
  const view = (value: string) =>
    fireEvent.click(
      screen.getByRole('radio', { name: value === 'gantt' ? 'AITaskGantt.title' : `AITaskBoard.${value}` }),
    )
  const choose = (name: string) => {
    fireEvent.click(screen.getByRole('button', { name: 'AITaskExecutionDetails.selectTask' }))
    fireEvent.click(screen.getByRole('menuitem', { name }))
  }
  const init = () => {
    const data = fixture.raw.taskDetailsMap.get('A')
    data.todoList.items = ['PENDING', 'DOING', 'DONE', 'SKIPPED', 'DELETED', 'PENDING'].map((status, index) => ({
      id: `a-${index}`,
      content: `A ${index} ${status}`,
      status,
      created_at: 1,
      updated_at: 2,
    }))
    return render(<AITaskExecutionDetails taskId="A" />)
  }
  const statOrder = () =>
    Array.from(document.querySelectorAll('.stats-overview [role="button"]')).map(
      (x) => x.querySelector('.stat-label')?.textContent,
    )
  const transfer = () => {
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
  it('filters all three views while preserving full-source statistics', () => {
    init()
    fireEvent.click(stat('pending'))
    expect(screen.queryByText('A 0 PENDING')).not.toBeInTheDocument()
    expect(within(stat('pending')).getByText('2')).toBeInTheDocument()
    expect(within(stat('created')).getByText('6')).toBeInTheDocument()
    view('board')
    expect(screen.queryByText('A 0 PENDING')).not.toBeInTheDocument()
    expect(screen.getByText('A 1 DOING')).toBeInTheDocument()
    expect(screen.getByText('A 3 SKIPPED')).toBeInTheDocument()
    expect(screen.getByText('A 4 DELETED')).toBeInTheDocument()
    view('gantt')
    const gantt = screen.getByRole('region', { name: 'AITaskGantt.title' })
    expect(within(gantt).queryByText('A 0 PENDING')).not.toBeInTheDocument()
    expect(within(gantt).getByRole('button', { name: 'AITaskExecutionDetails.statusPending' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
  })
  it('lets Gantt legends restore a hidden status in every view', () => {
    init()
    fireEvent.click(stat('pending'))
    view('gantt')
    const legend = within(screen.getByRole('region', { name: 'AITaskGantt.title' })).getByRole('button', {
      name: 'AITaskExecutionDetails.statusPending',
    })
    fireEvent.keyDown(legend, { key: 'Enter' })
    expect(stat('pending')).toHaveAttribute('aria-pressed', 'true')
    view('board')
    expect(screen.getByText('A 0 PENDING')).toBeInTheDocument()
    view('list')
    expect(screen.getByText('A 5 PENDING')).toBeInTheDocument()
  })
  it('hides and restores all statuses from total without losing counts or the view selector', () => {
    init()
    fireEvent.click(stat('created'))
    expect(screen.getByRole('status')).toHaveTextContent('AITaskStatusControls.noVisibleTasks')
    expect(screen.queryByText('A 1 DOING')).not.toBeInTheDocument()
    expect(within(stat('created')).getByText('6')).toBeInTheDocument()
    view('board')
    expect(screen.queryByText('A 2 DONE')).not.toBeInTheDocument()
    fireEvent.keyDown(stat('created'), { key: ' ' })
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(screen.getByText('A 2 DONE')).toBeInTheDocument()
    expect(stat('deleted')).toHaveAttribute('aria-pressed', 'true')
  })
  it('moves adjacent status groups both ways through real drag events and links all view orders', () => {
    init()
    const dataTransfer = transfer()
    fireEvent.dragStart(stat('doing'), { dataTransfer })
    fireEvent.drop(stat('pending'), { dataTransfer })
    fireEvent.dragEnd(stat('doing'), { dataTransfer })
    expect(statOrder().slice(1, 3)).toEqual([
      'AITaskExecutionDetails.statusPending',
      'AITaskExecutionDetails.statusDoing',
    ])
    const unfinished = screen.getByText('A 0 PENDING').parentElement!
    expect(Array.from(unfinished.children).map((x) => x.textContent)).toEqual([
      'A 0 PENDING',
      'A 5 PENDING',
      'A 1 DOING',
    ])
    view('board')
    expect(within(screen.getByRole('region', { name: 'AITaskBoard.title' })).getAllByRole('list')[0]).toHaveAttribute(
      'aria-label',
      'AITaskBoard.PENDING',
    )
    view('gantt')
    const gantt = screen.getByRole('region', { name: 'AITaskGantt.title' })
    expect(within(gantt).getAllByRole('button')[0]).toHaveAttribute(
      'aria-label',
      'A 0 PENDING: AITaskExecutionDetails.statusPending',
    )
    expect(
      Array.from(gantt.querySelectorAll('.gantt-legend .legend-item'))
        .slice(0, 2)
        .map((x) => x.textContent),
    ).toEqual(['AITaskExecutionDetails.statusPending', 'AITaskExecutionDetails.statusDoing'])
    fireEvent.keyDown(stat('pending'), { key: 'ArrowRight', altKey: true })
    expect(statOrder().slice(1, 3)).toEqual([
      'AITaskExecutionDetails.statusDoing',
      'AITaskExecutionDetails.statusPending',
    ])
    expect(fixture.send).not.toHaveBeenCalled()
  })
  it('applies existing filters to in-place stream status changes without stale counts', () => {
    init()
    fireEvent.click(stat('pending'))
    const data = fixture.raw.taskDetailsMap.get('A')
    data.uuid = 'A-updated'
    data.todoList.items[0].status = 'DONE'
    act(() => chatStore.setState({ taskDetailsUpdate: 1 } as any))
    expect(screen.getByText('A 0 PENDING')).toBeInTheDocument()
    expect(screen.queryByText('A 5 PENDING')).not.toBeInTheDocument()
    expect(within(stat('pending')).getByText('1')).toBeInTheDocument()
    expect(within(stat('done')).getByText('2')).toBeInTheDocument()
    expect(stat('pending')).toHaveAttribute('aria-pressed', 'false')
  })
  it('resets filters and ordering when the selected task changes', () => {
    init()
    fireEvent.click(stat('pending'))
    fireEvent.keyDown(stat('deleted'), { altKey: true, key: 'ArrowLeft' })
    choose('B')
    expect(screen.getByText('B step')).toBeInTheDocument()
    expect(stat('pending')).toHaveAttribute('aria-pressed', 'true')
    expect(statOrder()[statOrder().length - 1]).toBe('AITaskExecutionDetails.statusDeleted')
    choose('A')
    expect(screen.getByText('A 0 PENDING')).toBeInTheDocument()
  })
  it('keeps unknown-state rows reachable and hides them through total', () => {
    fixture.raw.taskDetailsMap
      .get('A')
      .todoList.items.push({ id: 'future', content: 'future state', status: 'FUTURE', created_at: 1, updated_at: 1 })
    render(<AITaskExecutionDetails taskId="A" />)
    expect(screen.getByText('future state')).toBeInTheDocument()
    fireEvent.click(stat('created'))
    expect(screen.queryByText('future state')).not.toBeInTheDocument()
    fireEvent.click(stat('created'))
    view('board')
    expect(screen.getByText('future state')).toBeInTheDocument()
  })
  it('resets display preferences across sessions even when the task id is reused', () => {
    const { rerender } = init()
    fireEvent.click(stat('pending'))
    fireEvent.keyDown(stat('deleted'), { altKey: true, key: 'ArrowLeft' })
    fixture.id = 'session-b'
    fixture.raw = { taskDetailsMap: new Map([['A', task('A')]]) }
    rerender(<AITaskExecutionDetails taskId="A" taskName="Session B task" />)
    expect(screen.getByText('A step')).toBeInTheDocument()
    expect(stat('pending')).toHaveAttribute('aria-pressed', 'true')
    expect(statOrder()[statOrder().length - 1]).toBe('AITaskExecutionDetails.statusDeleted')
  })
})

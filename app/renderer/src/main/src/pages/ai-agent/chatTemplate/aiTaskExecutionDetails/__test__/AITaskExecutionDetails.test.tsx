import React from 'react'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createStore } from 'zustand/vanilla'
import cloneDeep from 'lodash/cloneDeep'
import '../../../../ai-re-act/hooks/__test__/setupElectron'

const fixture = vi.hoisted(() => ({ raw: { taskDetailsMap: new Map<string, any>() }, id: 'session-a' }))
let chatStore = createStore(() => ({ chatTodoListUpdate: 0 }))
vi.mock('@/pages/ai-re-act/hooks/useCurrentDataBySession', () => ({
  useCurrentRawData: () => fixture.raw,
  useCurrentStore: () => chatStore,
}))
vi.mock('@/pages/ai-re-act/hooks/useCurrentSessionId', () => ({ default: () => fixture.id }))
vi.mock('@/pages/ai-agent/useContext/useDispatcher', () => ({ default: () => ({ onSend: vi.fn() }) }))
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
vi.mock('../aiTaskBoard/AITaskBoardView', () => ({
  AITaskBoardView: ({ items }: any) => (
    <div role="region" aria-label="board">
      {items.map((item: any) => (
        <p key={item.id}>
          {item.content}: {item.status}
        </p>
      ))}
    </div>
  ),
}))

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
  fixture.id = 'session-a'
  fixture.raw = {
    taskDetailsMap: new Map([
      ['A', task('A')],
      ['B', task('B')],
    ]),
  }
  chatStore = createStore(() => ({ chatTodoListUpdate: 0 }))
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
    expect(screen.queryByRole('region', { name: 'board' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('radio', { name: 'AITaskBoard.board' }))
    expect(screen.getByText('A step: PENDING')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('radio', { name: 'AITaskBoard.list' }))
    expect(screen.getByText('A step')).toBeInTheDocument()
  })

  it('refreshes the selected board immediately from todo update signals', () => {
    render(<AITaskExecutionDetails taskId="A" />)
    fireEvent.click(screen.getByRole('radio', { name: 'AITaskBoard.board' }))
    fixture.raw.taskDetailsMap.get('A').uuid = 'A-2'
    fixture.raw.taskDetailsMap.get('A').todoList.items[0].status = 'DONE'
    act(() => chatStore.setState({ chatTodoListUpdate: 1 }))
    expect(screen.getByText('A step: DONE')).toBeInTheDocument()
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

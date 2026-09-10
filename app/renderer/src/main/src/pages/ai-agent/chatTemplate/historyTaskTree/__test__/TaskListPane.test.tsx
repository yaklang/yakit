import { act, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createStore } from 'zustand/vanilla'
import { AIChatQSDataTypeEnum } from '@/pages/ai-re-act/hooks/aiRender'
import { TaskListPane } from '../TaskListPane'

const store = createStore(() => ({
  currentPlan: { task_tree: [] as object[] },
  currentChatStatus: { coordinatorId: 'current' },
  planHistoryList: { records: [] as { coordinator_id: string }[] },
  chatElements: [] as { token: string; chatType: string }[],
  tasks: {} as Record<string, { renderNum: number }>,
}))
const initialState = store.getState()
const contents = new Map<string, { type: string; data: { taskId: string } }>()
vi.mock('@/pages/ai-re-act/hooks/useCurrentDataBySession', () => ({
  useCurrentStore: () => store,
  useCurrentRawData: () => ({ contents }),
}))
vi.mock('@/pages/ai-re-act/hooks/useAIItemKind', () => ({ default: () => () => 'task' }))
vi.mock('../HistoryTaskTree', () => ({ HistoryTaskTree: () => <div>任务树</div> }))
vi.mock('../SubAgentList', () => ({ SubAgentList: () => <div>子 Agent</div> }))
vi.mock('@/components/yakitUI/YakitEmpty/YakitEmpty', () => ({ YakitEmpty: () => <div>暂无数据</div> }))

beforeEach(() => {
  store.setState(initialState, true)
  contents.clear()
})

describe('TaskListPane', () => {
  it('所有数据为空时显示空状态，数据到达和清空时同步切换', () => {
    render(<TaskListPane />)
    expect(screen.getByText('暂无数据')).toBeInTheDocument()
    expect(screen.queryByText('任务树')).not.toBeInTheDocument()
    act(() => store.setState({ currentPlan: { task_tree: [{}] } }))
    expect(screen.queryByText('暂无数据')).not.toBeInTheDocument()
    expect(screen.getByText('任务树')).toBeInTheDocument()
    act(() => store.setState({ currentPlan: { task_tree: [] } }))
    expect(screen.getByText('暂无数据')).toBeInTheDocument()
  })

  it('仅有历史任务时保留列表，但排除当前协调器的重复历史记录', () => {
    store.setState({ planHistoryList: { records: [{ coordinator_id: 'history' }] } })
    render(<TaskListPane />)
    expect(screen.getByText('任务树')).toBeInTheDocument()
    expect(screen.queryByText('暂无数据')).not.toBeInTheDocument()
    act(() => store.setState({ planHistoryList: { records: [{ coordinator_id: 'current' }] } }))
    expect(screen.getByText('暂无数据')).toBeInTheDocument()
  })

  it('仅有子 Agent 时保留列表，移除后显示空状态', () => {
    contents.set('child', { type: AIChatQSDataTypeEnum.TASK_NODE_GROUP, data: { taskId: 'child' } })
    store.setState({ chatElements: [{ token: 'child', chatType: 'reAct' }], tasks: { child: { renderNum: 1 } } })
    render(<TaskListPane />)
    expect(screen.getByText('子 Agent')).toBeInTheDocument()
    expect(screen.queryByText('暂无数据')).not.toBeInTheDocument()
    act(() => store.setState({ chatElements: [] }))
    expect(screen.getByText('暂无数据')).toBeInTheDocument()
  })
})

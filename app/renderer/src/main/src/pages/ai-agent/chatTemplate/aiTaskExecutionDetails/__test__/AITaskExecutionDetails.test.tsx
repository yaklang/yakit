import { act, cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import cloneDeep from 'lodash/cloneDeep'
import type { PlanItemDetailsData, TodoListCardData } from '@/pages/ai-re-act/hooks/aiRender'
import { DefaultPlanItemDetailsData } from '@/pages/ai-re-act/hooks/defaultConstant'
import { AITaskExecutionDetails } from '../AITaskExecutionDetails'

const taskDetailsMap = new Map<string, PlanItemDetailsData>()
const todoDetail = vi.fn(({ todoData }: { todoData: TodoListCardData }) => (
  <div data-testid="todo-detail">{todoData.items.map((item) => item.content).join(',')}</div>
))

// 保留真实的数据读取、轮询和快照逻辑，只隔离会话来源及无关子组件。
vi.mock('@/pages/ai-re-act/hooks/useCurrentDataBySession', () => ({
  useCurrentRawData: () => ({ taskDetailsMap }),
}))
vi.mock('@/pages/ai-re-act/hooks/useCurrentSessionId', () => ({ default: () => 'session-1' }))
vi.mock('../../../useContext/useDispatcher', () => ({ default: () => ({ onSend: vi.fn() }) }))
vi.mock('@/pages/ai-re-act/aiReActChat/aiToDoList/AIToDoListDetail', () => ({
  AIToDoListDetail: (props: { todoData: TodoListCardData }) => todoDetail(props),
}))
vi.mock('@/pages/ai-re-act/aiReActChat/aiToDoList/AIToDoList', () => ({
  AIToDoListItem: ({ item }: { item: TodoListCardData['items'][number] }) => <div>{item.content}</div>,
}))
vi.mock('@/pages/plugins/operator/horizontalScrollCard/HorizontalScrollCard', () => ({
  HorizontalScrollCardItemInfoMultiple: () => null,
  HorizontalScrollCardItemInfoSingle: () => null,
}))
vi.mock('@/components/RollingLoadList/RollingLoadList', () => ({ RollingLoadList: () => null }))
vi.mock('@/components/TableTotalAndSelectNumber/TableTotalAndSelectNumber', () => ({
  TableTotalAndSelectNumber: () => null,
}))
vi.mock('@/components/yakitUI/YakitEmpty/YakitEmpty', () => ({
  YakitEmpty: ({ title }: { title: string }) => <div>{title}</div>,
}))
vi.mock('@/pages/ai-agent/grpc', () => ({ grpcQueryAIForge: vi.fn() }))
vi.mock('@/pages/ai-agent/aiToolList/utils', () => ({ grpcGetAIToolList: vi.fn() }))
vi.mock('@/pages/plugins/utils', () => ({ apiQueryYakScript: vi.fn() }))
vi.mock('@/pages/ai-agent/aiMCP/utils', () => ({ grpcGetAllMCPServers: vi.fn() }))

const createTask = (taskId: string, summary: string) => {
  const data = cloneDeep(DefaultPlanItemDetailsData)
  data.taskId = taskId
  data.uuid = 'uuid-1'
  data.perception.summary = summary
  data.todoList.items = [
    { id: `${taskId}-todo`, content: `${summary}待办`, status: 'PENDING', created_at: 1, updated_at: 1 },
  ]
  data.todoList.stats.pending = 1
  taskDetailsMap.set(taskId, data)
  return data
}

beforeEach(() => {
  vi.useFakeTimers()
  taskDetailsMap.clear()
  todoDetail.mockClear()
})

afterEach(() => {
  cleanup()
  vi.clearAllTimers()
  vi.useRealTimers()
})

describe('AITaskExecutionDetails 快照刷新', () => {
  it('taskId 切换立即读取新任务，即使两个任务的 uuid 相同', () => {
    createTask('task-a', '任务 A 感知')
    createTask('task-b', '任务 B 感知')
    const { rerender } = render(<AITaskExecutionDetails taskId="task-a" />)
    expect(screen.getByText('任务 A 感知')).toBeInTheDocument()

    rerender(<AITaskExecutionDetails taskId="task-b" />)

    expect(screen.queryByText('任务 A 感知')).not.toBeInTheDocument()
    expect(screen.getByText('任务 B 感知')).toBeInTheDocument()
    expect(screen.getByTestId('todo-detail')).toHaveTextContent('任务 B 感知待办')
  })

  it.each(['missing-task', ''])('切换到无数据的 taskId %j 时立即清空旧详情', (taskId) => {
    createTask('task-a', '旧任务感知')
    const { rerender } = render(<AITaskExecutionDetails taskId="task-a" />)
    expect(screen.getByTestId('todo-detail')).toHaveTextContent('旧任务感知待办')

    rerender(<AITaskExecutionDetails taskId={taskId} />)

    expect(screen.queryByText('旧任务感知')).not.toBeInTheDocument()
    expect(screen.queryByTestId('todo-detail')).not.toBeInTheDocument()
    expect(screen.getByText('暂无待办任务')).toBeInTheDocument()
  })

  it('uuid 变化后在 5 秒轮询时生成新快照并刷新详情', () => {
    const data = createTask('task-a', '刷新前感知')
    render(<AITaskExecutionDetails taskId="task-a" />)
    const previousTodo = todoDetail.mock.calls.at(-1)![0].todoData

    data.perception.summary = '刷新后感知'
    data.todoList.items[0].content = '刷新后待办'
    data.uuid = 'uuid-2'
    act(() => vi.advanceTimersByTime(4999))
    expect(screen.getByText('刷新前感知')).toBeInTheDocument()

    act(() => vi.advanceTimersByTime(1))

    expect(screen.queryByText('刷新前感知')).not.toBeInTheDocument()
    expect(screen.getByText('刷新后感知')).toBeInTheDocument()
    expect(screen.getByTestId('todo-detail')).toHaveTextContent('刷新后待办')
    expect(todoDetail.mock.calls.at(-1)![0].todoData).not.toBe(previousTodo)
    expect(previousTodo.items[0].content).toBe('刷新前感知待办')
  })

  it('Map 条目原地修改且 uuid 不变时，轮询和父组件重渲染均不污染已渲染快照', () => {
    const data = createTask('task-a', '原始感知')
    const { rerender } = render(<AITaskExecutionDetails taskId="task-a" taskName="原始标题" />)
    const renderedTodo = todoDetail.mock.calls.at(-1)![0].todoData

    data.perception.summary = '未发布感知'
    data.todoList.items[0].content = '未发布待办'
    data.todoList.items[0].status = 'DONE'
    data.todoList.stats.pending = 0
    data.todoList.stats.done = 1
    act(() => vi.advanceTimersByTime(5000))
    // 改变非数据属性，确保 React.memo 不会跳过本次组件渲染。
    rerender(<AITaskExecutionDetails taskId="task-a" taskName="新标题" />)

    expect(screen.getByText('新标题')).toBeInTheDocument()
    expect(screen.getByText('原始感知')).toBeInTheDocument()
    expect(screen.queryByText('未发布感知')).not.toBeInTheDocument()
    expect(screen.getByTestId('todo-detail')).toHaveTextContent('原始感知待办')
    expect(todoDetail.mock.calls.at(-1)![0].todoData).toBe(renderedTodo)
    expect(renderedTodo.items[0]).toMatchObject({ content: '原始感知待办', status: 'PENDING' })
    expect(renderedTodo.stats).toMatchObject({ pending: 1, done: 0 })
  })
})

/** 漏洞个数为真实 DOM（HorizontalScrollCard 已 mock），限定在该卡片内断言避免与其它「暂无」冲突 */
const getRiskMetric = () => screen.getByText('漏洞个数').parentElement as HTMLElement

describe('AITaskExecutionDetails 漏洞个数', () => {
  it('risk_level_count 按严重/高危/中危/低危/信息映射，info 与 other 合并', () => {
    const data = createTask('task-risk', '漏洞映射感知')
    data.execution.risk_level_count = {
      critical: 4,
      high: 6,
      warning: 1,
      low: 3,
      info: 5,
      other: 3,
      total: 22,
    }
    render(<AITaskExecutionDetails taskId="task-risk" />)

    const riskMetric = getRiskMetric()
    expect(riskMetric).toHaveTextContent('4｜6｜1｜3｜8')
    for (const value of ['4', '6', '1', '3', '8']) {
      expect(within(riskMetric).getByText(value)).toBeInTheDocument()
    }
  })

  it('等级计数为 0 时不展示该等级', () => {
    const data = createTask('task-risk-partial-zero', '漏洞过滤感知')
    data.execution.risk_level_count = {
      critical: 2,
      high: 0,
      warning: 0,
      low: 1,
      info: 0,
      other: 0,
      total: 3,
    }
    render(<AITaskExecutionDetails taskId="task-risk-partial-zero" />)

    const riskMetric = getRiskMetric()
    expect(within(riskMetric).getByText('2')).toBeInTheDocument()
    expect(within(riskMetric).getByText('1')).toBeInTheDocument()
    expect(riskMetric.textContent || '').not.toMatch(/(^|[｜])0([｜]|$)/)
    expect(riskMetric).toHaveTextContent('2｜1')
  })

  it('缺 risk_level_count 时回退展示 risk_count', () => {
    const data = createTask('task-risk-fallback', '漏洞回退感知')
    // 模拟后端未下发等级明细，仅有总数
    delete (data.execution as { risk_level_count?: unknown }).risk_level_count
    data.execution.risk_count = 9
    render(<AITaskExecutionDetails taskId="task-risk-fallback" />)

    const riskMetric = getRiskMetric()
    expect(riskMetric).toHaveTextContent('漏洞个数9')
    expect(within(riskMetric).getByText('9')).toBeInTheDocument()
  })

  it('无 execution 时显示「暂无」', () => {
    const data = createTask('task-risk-empty', '无执行感知')
    delete (data as { execution?: unknown }).execution
    render(<AITaskExecutionDetails taskId="task-risk-empty" />)

    const riskMetric = getRiskMetric()
    expect(riskMetric).toHaveTextContent('漏洞个数暂无')
    expect(within(riskMetric).getByText('暂无')).toBeInTheDocument()
  })
})

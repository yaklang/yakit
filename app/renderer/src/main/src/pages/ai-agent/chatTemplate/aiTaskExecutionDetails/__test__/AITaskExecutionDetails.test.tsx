import type { ReactNode } from 'react'
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createStore } from 'zustand/vanilla'
import cloneDeep from 'lodash/cloneDeep'
import type { PlanItemDetailsData, TodoListCardData } from '@/pages/ai-re-act/hooks/aiRender'
import type { AIAgentGrpcApi } from '@/pages/ai-re-act/hooks/grpcApi'
import { AIInputEventSyncTypeEnum } from '@/pages/ai-re-act/hooks/grpcApi'
import { DefaultPlanItemDetailsData } from '@/pages/ai-re-act/hooks/defaultConstant'
import { AITaskExecutionDetails } from '../AITaskExecutionDetails'

const taskDetailsMap = new Map<string, PlanItemDetailsData>()
const todoDetail = vi.fn(({ todoData }: { todoData: TodoListCardData }) => (
  <div data-testid="todo-detail">{todoData.items.map((item) => item.content).join(',')}</div>
))
const onSend = vi.fn(() => true)
const sessionStore = createStore(() => ({
  sessionTaskList: [] as AIAgentGrpcApi.SessionSnapshotTaskSummary[],
}))

/** 可变 i18n 状态：模拟语言切换时 t 结果变、i18nRefresh 抬升（t 引用本身稳定） */
const { i18nState } = vi.hoisted(() => ({
  i18nState: {
    refresh: 0,
    prefix: '',
    translate(key: string, options?: Record<string, unknown>) {
      let text = `${this.prefix}${key}`
      if (!options) return text
      return Object.entries(options).reduce((acc, [k, v]) => {
        if (typeof v === 'string' || typeof v === 'number') {
          return acc.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), String(v))
        }
        return acc
      }, text)
    },
  },
}))

// i18n 直接回 key，避免测试环境加载懒资源
vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({
    t: (key: string, options?: Record<string, unknown>) => i18nState.translate(key, options),
    get i18nRefresh() {
      return i18nState.refresh
    },
  }),
}))

// 保留真实的数据读取、轮询和快照逻辑，只隔离会话来源及无关子组件。
vi.mock('@/pages/ai-re-act/hooks/useCurrentDataBySession', () => ({
  useCurrentRawData: () => ({ taskDetailsMap }),
  useCurrentStore: () => sessionStore,
}))
vi.mock('@/pages/ai-re-act/hooks/useCurrentSessionId', () => ({ default: () => 'session-1' }))
vi.mock('../../../useContext/useDispatcher', () => ({ default: () => ({ onSend }) }))
vi.mock('@/components/yakitUI/YakitDropdownMenu/YakitDropdownMenu', () => ({
  YakitDropdownMenu: ({
    menu,
    children,
  }: {
    menu: { data?: { key: string; label: string }[]; onClick?: (info: { key: string }) => void }
    children?: ReactNode
  }) => (
    <div data-testid="task-dropdown">
      {children}
      <ul data-testid="task-dropdown-menu">
        {(menu.data || []).map((item) => (
          <li key={item.key}>
            <button type="button" onClick={() => menu.onClick?.({ key: item.key })}>
              {item.label}
            </button>
          </li>
        ))}
      </ul>
    </div>
  ),
}))
vi.mock('@/pages/ai-re-act/aiReActChat/aiToDoList/AIToDoListDetail', () => ({
  AIToDoListDetail: (props: { todoData: TodoListCardData }) => todoDetail(props),
}))
vi.mock('@/pages/ai-re-act/aiReActChat/aiToDoList/AIToDoList', () => ({
  AIToDoListItem: ({ item }: { item: TodoListCardData['items'][number] }) => <div>{item.content}</div>,
}))
vi.mock('@/pages/plugins/operator/horizontalScrollCard/HorizontalScrollCard', () => ({
  HorizontalScrollCardItemInfoMultiple: ({ info, tag }: { info: { Id: string; Data: string }[]; tag: string }) => (
    <div data-testid={`summary-multiple-${tag}`}>
      {info.map((item) => (
        <div key={item.Id}>
          <div>{item.Data}</div>
          <div>{item.Id}</div>
        </div>
      ))}
    </div>
  ),
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
vi.mock('../AITaskExecutionDetails.module.scss', () => ({
  default: new Proxy({}, { get: (_, key) => (key === '__esModule' ? false : key) }),
}))
vi.mock('../aiTaskGantt/AITaskGantt.module.scss', () => ({
  default: new Proxy({}, { get: (_, key) => (key === '__esModule' ? false : key) }),
}))
vi.mock('../aiTaskBoard/AITaskBoard.module.scss', () => ({
  default: new Proxy({}, { get: (_, key) => (key === '__esModule' ? false : key) }),
}))

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
  onSend.mockClear()
  sessionStore.setState({ sessionTaskList: [] }, true)
  i18nState.refresh = 0
  i18nState.prefix = ''
})

afterEach(() => {
  cleanup()
  vi.clearAllTimers()
  vi.useRealTimers()
})

describe('AITaskExecutionDetails 技能列表', () => {
  it('固定和动态列表只展示 skills，排除 forges', () => {
    const data = createTask('task-skills', '技能感知')
    data.skills.fixed = [{ name: 'fixed-skill', verbose_name: 'fixed-skill', description: '', category: 'skill' }]
    data.skills.dynamic = [{ name: 'dynamic-skill', description: '', category: 'skill', skill_load_state: 'metadata' }]
    data.forges.fixed = [{ name: 'fixed-forge', verbose_name: 'fixed-forge', description: '', category: 'forge' }]
    data.forges.dynamic = [{ name: 'dynamic-forge', description: '', category: 'forge' }]
    render(<AITaskExecutionDetails taskId="task-skills" />)

    expect(screen.getByText('fixed-skill')).toBeInTheDocument()
    expect(screen.queryByText('fixed-forge')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('radio', { name: 'AITaskExecutionDetails.dynamicLoad' }))
    expect(screen.getByText('dynamic-skill')).toBeInTheDocument()
    expect(screen.queryByText('dynamic-forge')).not.toBeInTheDocument()
  })

  it('只有 forges 时不展示技能区域', () => {
    const data = createTask('task-forges', 'Forge 感知')
    data.forges.fixed = [{ name: 'fixed-forge', verbose_name: 'fixed-forge', description: '', category: 'forge' }]
    data.forges.dynamic = [{ name: 'dynamic-forge', description: '', category: 'forge' }]
    render(<AITaskExecutionDetails taskId="task-forges" />)

    expect(screen.queryByText('AITaskExecutionDetails.skill')).not.toBeInTheDocument()
    expect(screen.queryByText('fixed-forge')).not.toBeInTheDocument()
    expect(screen.queryByText('dynamic-forge')).not.toBeInTheDocument()
  })
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
    expect(screen.getByText('AITaskExecutionDetails.emptyTodoTitle')).toBeInTheDocument()
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

    expect(screen.getByLabelText('AITaskExecutionDetails.selectTask')).toHaveTextContent('新标题')
    expect(screen.getByText('原始感知')).toBeInTheDocument()
    expect(screen.queryByText('未发布感知')).not.toBeInTheDocument()
    expect(screen.getByTestId('todo-detail')).toHaveTextContent('原始感知待办')
    expect(todoDetail.mock.calls.at(-1)![0].todoData).toBe(renderedTodo)
    expect(renderedTodo.items[0]).toMatchObject({ content: '原始感知待办', status: 'PENDING' })
    expect(renderedTodo.stats).toMatchObject({ pending: 1, done: 0 })
  })
})

/** 漏洞个数在竖向指标列表行内，限定在该行断言避免与其它「暂无」冲突 */
const getRiskMetric = () => screen.getByText('AITaskExecutionDetails.riskCount').parentElement as HTMLElement

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
    expect(riskMetric).toHaveTextContent('AITaskExecutionDetails.riskCount9')
    expect(within(riskMetric).getByText('9')).toBeInTheDocument()
  })

  it('无 execution 时显示「暂无」', () => {
    const data = createTask('task-risk-empty', '无执行感知')
    delete (data as { execution?: unknown }).execution
    render(<AITaskExecutionDetails taskId="task-risk-empty" />)

    const riskMetric = getRiskMetric()
    expect(riskMetric).toHaveTextContent('AITaskExecutionDetails.riskCountAITaskExecutionDetails.noData')
    expect(within(riskMetric).getByText('AITaskExecutionDetails.noData')).toBeInTheDocument()
  })
})

describe('AITaskExecutionDetails 任务统计视图切换', () => {
  const createTaskWithStatuses = (taskId: string) => {
    const data = cloneDeep(DefaultPlanItemDetailsData)
    data.taskId = taskId
    data.uuid = 'uuid-1'
    data.perception.summary = '多状态感知'
    data.todoList.items = [
      { id: 't-pending', content: '排队任务', status: 'PENDING', created_at: 1, updated_at: 1 },
      { id: 't-doing', content: '执行任务', status: 'DOING', created_at: 1, updated_at: 1 },
      { id: 't-done', content: '完成任务', status: 'DONE', created_at: 1, updated_at: 1 },
      { id: 't-skipped', content: '跳过任务', status: 'SKIPPED', created_at: 1, updated_at: 1 },
      { id: 't-deleted', content: '删除任务', status: 'DELETED', created_at: 1, updated_at: 1 },
    ]
    data.todoList.stats = { pending: 1, doing: 1, done: 1, skipped: 1, deleted: 1 }
    taskDetailsMap.set(taskId, data)
    return data
  }

  /** 状态统计：标题与看板列头/甘特图状态标签重名，需过滤出 stat-item 内的那个 */
  const getStatCount = (title: string) => {
    const el = screen.getAllByText(title).find((node) => node.closest('.stat-item'))
    const item = el!.closest('.stat-item') as HTMLElement
    return (item.querySelector('.stat-count') as HTMLElement).textContent
  }

  it('默认渲染看板视图：按状态分组各列并展示统计计数', () => {
    createTaskWithStatuses('task-board')
    render(<AITaskExecutionDetails taskId="task-board" />)

    // 统计卡计数与状态分组一致
    expect(getStatCount('AITaskExecutionDetails.statusCreated')).toBe('5')
    expect(getStatCount('AITaskExecutionDetails.statusPending')).toBe('1')
    expect(getStatCount('AITaskExecutionDetails.statusDoing')).toBe('1')
    expect(getStatCount('AITaskExecutionDetails.statusDone')).toBe('1')
    expect(getStatCount('AITaskExecutionDetails.statusSkipped')).toBe('1')
    expect(getStatCount('AITaskExecutionDetails.statusDeleted')).toBe('1')

    // 看板列头与列卡片（看板列标题与统计卡标题重名，用重名仅存在于看板的列定位）
    expect(screen.getByText('AITaskExecutionDetails.columnDoing')).toBeInTheDocument()
    expect(screen.getByText('AITaskExecutionDetails.columnSkippedOrDeleted')).toBeInTheDocument()
    expect(screen.getByText('排队任务')).toBeInTheDocument()
    expect(screen.getByText('执行任务')).toBeInTheDocument()
    expect(screen.getByText('完成任务')).toBeInTheDocument()
    expect(screen.getByText('跳过任务')).toBeInTheDocument()
    expect(screen.getByText('删除任务')).toBeInTheDocument()
    // 甘特图未渲染
    expect(document.querySelector('.ai-task-gantt')).toBeNull()
  })

  it('点击状态统计可隐藏对应待办，再次点击恢复', () => {
    createTaskWithStatuses('task-filter')
    render(<AITaskExecutionDetails taskId="task-filter" />)

    expect(screen.getByText('排队任务')).toBeInTheDocument()
    expect(screen.getByText('执行任务')).toBeInTheDocument()

    fireEvent.click(screen.getByText('AITaskExecutionDetails.statusPending'))
    expect(screen.queryByText('排队任务')).not.toBeInTheDocument()
    expect(screen.getByText('执行任务')).toBeInTheDocument()

    fireEvent.click(screen.getByText('AITaskExecutionDetails.statusPending'))
    expect(screen.getByText('排队任务')).toBeInTheDocument()
  })

  it('点击已创建在全隐藏与全显示之间切换', () => {
    createTaskWithStatuses('task-filter-all')
    render(<AITaskExecutionDetails taskId="task-filter-all" />)

    expect(screen.getByText('排队任务')).toBeInTheDocument()
    fireEvent.click(screen.getByText('AITaskExecutionDetails.statusCreated'))
    expect(screen.queryByText('排队任务')).not.toBeInTheDocument()
    expect(screen.queryByText('执行任务')).not.toBeInTheDocument()
    expect(screen.queryByText('完成任务')).not.toBeInTheDocument()

    fireEvent.click(screen.getByText('AITaskExecutionDetails.statusCreated'))
    expect(screen.getByText('排队任务')).toBeInTheDocument()
    expect(screen.getByText('执行任务')).toBeInTheDocument()
  })

  it('切换到甘特图视图：渲染时间轴并保留状态分组统计', () => {
    createTaskWithStatuses('task-gantt')
    render(<AITaskExecutionDetails taskId="task-gantt" />)

    // 甘特图尚未出现
    expect(document.querySelector('.ai-task-gantt')).toBeNull()

    // Segmented 选项 label 点击触发底层 radio change（fake timers 下不走 userEvent）
    fireEvent.click(screen.getByText('AITaskExecutionDetails.progress'))

    // 甘特图渲染：条带上方叠状态与文字，无左侧 Todo list
    expect(screen.queryByText('Todo list')).not.toBeInTheDocument()
    expect(screen.getByText('排队任务')).toBeInTheDocument()
    expect(screen.getByText('删除任务')).toBeInTheDocument()
    // 甘特图与统计计数不因视图切换丢失
    expect(document.querySelector('.ai-task-gantt')).not.toBeNull()
    expect(getStatCount('AITaskExecutionDetails.statusCreated')).toBe('5')
    // 看板列头不再渲染（「待处理」在甘特图状态标签中仍存在，用看板独有的列头断言）
    expect(screen.queryByText('AITaskExecutionDetails.columnSkippedOrDeleted')).not.toBeInTheDocument()

    // 切回看板
    fireEvent.click(screen.getByText('AITaskExecutionDetails.board'))
    expect(document.querySelector('.ai-task-gantt')).toBeNull()
    expect(screen.getByText('AITaskExecutionDetails.columnSkippedOrDeleted')).toBeInTheDocument()
  })

  it('无待办时两种视图均不渲染', () => {
    const data = cloneDeep(DefaultPlanItemDetailsData)
    data.taskId = 'task-empty'
    data.uuid = 'uuid-1'
    data.todoList.items = []
    taskDetailsMap.set('task-empty', data)
    render(<AITaskExecutionDetails taskId="task-empty" />)

    expect(screen.getByText('AITaskExecutionDetails.emptyTodoTitle')).toBeInTheDocument()
    expect(document.querySelector('.ai-task-board')).toBeNull()
    expect(document.querySelector('.ai-task-gantt')).toBeNull()
  })

  it('i18nRefresh 变化后统计卡与看板列标题重算（items 不变）', () => {
    createTaskWithStatuses('task-i18n-refresh')
    // taskName 仅用于冲破 React.memo，不参与 todo 缓存派生
    const { rerender } = render(<AITaskExecutionDetails taskId="task-i18n-refresh" taskName="lang-0" />)

    expect(getStatCount('AITaskExecutionDetails.statusCreated')).toBe('5')
    expect(screen.getByText('AITaskExecutionDetails.columnDoing')).toBeInTheDocument()

    // 仅改 t 输出并触发重渲、不抬升 i18nRefresh：渲染期文案更新，useCreation 缓存标题仍旧
    i18nState.prefix = 'en:'
    rerender(<AITaskExecutionDetails taskId="task-i18n-refresh" taskName="lang-1" />)
    expect(screen.getByText('en:AITaskExecutionDetails.title')).toBeInTheDocument()
    expect(getStatCount('AITaskExecutionDetails.statusCreated')).toBe('5')
    expect(screen.getByText('AITaskExecutionDetails.columnDoing')).toBeInTheDocument()

    // 抬升 i18nRefresh 后缓存文案才重算
    i18nState.refresh += 1
    rerender(<AITaskExecutionDetails taskId="task-i18n-refresh" taskName="lang-2" />)
    expect(getStatCount('en:AITaskExecutionDetails.statusCreated')).toBe('5')
    expect(getStatCount('en:AITaskExecutionDetails.statusPending')).toBe('1')
    expect(screen.getByText('en:AITaskExecutionDetails.columnDoing')).toBeInTheDocument()
    expect(screen.getByText('en:AITaskExecutionDetails.columnSkippedOrDeleted')).toBeInTheDocument()
    expect(screen.queryByText('AITaskExecutionDetails.statusCreated')).not.toBeInTheDocument()
  })
})

describe('AITaskExecutionDetails 任务下拉切换', () => {
  it('展示 sessionTaskList 中的任务项', () => {
    createTask('task-a', '任务 A 感知')
    sessionStore.setState({
      sessionTaskList: [
        {
          task_id: 'task-a',
          task_name: '任务甲',
          attempt: 1,
          status: 'running',
          is_final: false,
          updated_at: 1,
        },
        {
          task_id: 'task-b',
          task_name: '任务乙',
          attempt: 1,
          status: 'done',
          is_final: true,
          updated_at: 2,
        },
      ],
    })
    render(<AITaskExecutionDetails taskId="task-a" taskName="任务甲" />)

    const menu = screen.getByTestId('task-dropdown-menu')
    expect(within(menu).getByText('任务甲')).toBeInTheDocument()
    expect(within(menu).getByText('任务乙')).toBeInTheDocument()
    expect(screen.getByLabelText('AITaskExecutionDetails.selectTask')).toHaveTextContent('任务甲')
  })

  it('点击菜单项切换任务并发送 task_snapshot_sync', () => {
    createTask('task-a', '任务 A 感知')
    createTask('task-b', '任务 B 感知')
    sessionStore.setState({
      sessionTaskList: [
        {
          task_id: 'task-a',
          task_name: '任务甲',
          attempt: 1,
          status: 'running',
          is_final: false,
          updated_at: 1,
        },
        {
          task_id: 'task-b',
          task_name: '任务乙',
          attempt: 1,
          status: 'done',
          is_final: true,
          updated_at: 2,
        },
      ],
    })
    render(<AITaskExecutionDetails taskId="task-a" taskName="任务甲" taskGoal="任务甲目标" />)

    expect(screen.getByText('任务甲目标')).toBeInTheDocument()

    fireEvent.click(within(screen.getByTestId('task-dropdown-menu')).getByText('任务乙'))

    expect(screen.getByText('任务 B 感知')).toBeInTheDocument()
    expect(screen.queryByText('任务 A 感知')).not.toBeInTheDocument()
    // 快照无 goal：切换后清空，避免仍展示初始任务目标
    expect(screen.queryByText('任务甲目标')).not.toBeInTheDocument()
    expect(screen.getByText('AITaskExecutionDetails.noInfo')).toBeInTheDocument()
    expect(onSend).toHaveBeenCalledTimes(1)
    expect(onSend).toHaveBeenCalledWith(
      expect.objectContaining({
        token: 'session-1',
        params: expect.objectContaining({
          IsSyncMessage: true,
          SyncType: AIInputEventSyncTypeEnum.SYNC_TYPE_TASK_SNAPSHOT,
          SyncJsonInput: JSON.stringify({ task_id: 'task-b' }),
        }),
      }),
    )
  })

  it('taskId 切到新任务后，触发器文案跟 sessionTaskList 选中项一致（不沿用旧 taskName）', () => {
    createTask('task-a', '任务 A 感知')
    createTask('task-b', '任务 B 感知')
    sessionStore.setState({
      sessionTaskList: [
        {
          task_id: 'task-a',
          task_name: '任务甲',
          attempt: 1,
          status: 'running',
          is_final: false,
          updated_at: 1,
        },
        {
          task_id: 'task-b',
          task_name: '123',
          attempt: 1,
          status: 'running',
          is_final: false,
          updated_at: 2,
        },
      ],
    })
    const { rerender } = render(<AITaskExecutionDetails taskId="task-a" taskName="本机 hostscan" />)
    expect(screen.getByLabelText('AITaskExecutionDetails.selectTask')).toHaveTextContent('任务甲')

    // 发送新消息后父级只更新 taskId、taskName 仍滞后
    rerender(<AITaskExecutionDetails taskId="task-b" taskName="本机 hostscan" />)
    expect(screen.getByLabelText('AITaskExecutionDetails.selectTask')).toHaveTextContent('123')
    expect(screen.getByText('任务 B 感知')).toBeInTheDocument()
  })
})

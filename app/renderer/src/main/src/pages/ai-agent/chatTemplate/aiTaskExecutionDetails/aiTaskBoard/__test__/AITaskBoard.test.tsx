import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import moment from 'moment'
import type { AIAgentGrpcApi } from '@/pages/ai-re-act/hooks/grpcApi'
import { AITaskBoard } from '../AITaskBoard'

// 类名原样返回，便于按 class 断言跳过/删除卡片的置灰态
vi.mock('../AITaskBoard.module.scss', () => ({
  default: new Proxy({}, { get: (_, key) => (key === '__esModule' ? false : key) }),
}))

const BASE_TS = 1750000000
const fmtTime = (ts: number) => moment.unix(ts).format('HH:mm:ss')

const createItem = (item: Partial<AIAgentGrpcApi.TodoListUpdateItem>): AIAgentGrpcApi.TodoListUpdateItem => ({
  id: 'todo-1',
  content: '待办内容',
  status: 'PENDING',
  created_at: 1,
  updated_at: 1,
  created_ts: BASE_TS,
  ...item,
})

const createColumns = (items: AIAgentGrpcApi.TodoListUpdateItem[]) => [
  { key: 'pending', title: '待处理', icon: <span />, items },
]

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(BASE_TS * 1000)
})

afterEach(() => {
  cleanup()
  vi.clearAllTimers()
  vi.useRealTimers()
})

describe('AITaskBoard 状态分组', () => {
  it('按列渲染标题、计数与卡片内容', () => {
    const columns = [
      { key: 'pending', title: '待处理', icon: <span />, items: [createItem({ id: 'a', content: '排队中' })] },
      {
        key: 'skippedOrDeleted',
        title: '已跳过/已删除',
        icon: <span />,
        items: [
          createItem({ id: 'b', content: '已跳过项', status: 'SKIPPED' }),
          createItem({ id: 'c', content: '已删除项', status: 'DELETED' }),
        ],
      },
    ]
    render(<AITaskBoard columns={columns} />)

    for (const title of ['待处理', '已跳过/已删除']) {
      expect(screen.getByText(title)).toBeInTheDocument()
    }
    // 列头计数
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('排队中')).toBeInTheDocument()
    expect(screen.getByText('已跳过项')).toBeInTheDocument()
    expect(screen.getByText('已删除项')).toBeInTheDocument()
  })

  it('空列仍渲染列头与计数 0', () => {
    render(<AITaskBoard columns={createColumns([])} />)
    expect(screen.getByText('待处理')).toBeInTheDocument()
    expect(screen.getByText('0')).toBeInTheDocument()
  })
})

describe('AITaskBoard 卡片按状态展示', () => {
  it('PENDING：仅展示创建时间', () => {
    render(<AITaskBoard columns={createColumns([createItem({ content: '排队任务' })])} />)
    expect(screen.getByText(`创建时间 ${fmtTime(BASE_TS)}`)).toBeInTheDocument()
  })

  it('PENDING：无 created_ts 时创建时间显示占位符', () => {
    render(
      <AITaskBoard
        columns={createColumns([createItem({ content: '历史任务', created_ts: undefined, created_at: 9 })])}
      />,
    )
    expect(screen.getByText('创建时间 —')).toBeInTheDocument()
  })

  it('DOING：展示开始时间与耗时（优先 focus_seconds）', () => {
    render(
      <AITaskBoard
        columns={createColumns([
          createItem({
            content: '执行任务',
            status: 'DOING',
            focus_started_ts: BASE_TS - 3600,
            focus_seconds: 3975,
          }),
        ])}
      />,
    )
    // 3975s → 1h6m15s
    expect(screen.getByText('耗时 1h6m15s')).toBeInTheDocument()
    expect(screen.getByText(`开始 ${fmtTime(BASE_TS - 3600)} —`)).toBeInTheDocument()
  })

  it('DOING：无 focus_seconds 时用墙钟兜底实时耗时', () => {
    render(
      <AITaskBoard
        columns={createColumns([createItem({ content: '执行任务', status: 'DOING', focus_started_ts: BASE_TS - 66 })])}
      />,
    )
    // now - focus_started_ts = 66s
    expect(screen.getByText('耗时 1m6s')).toBeInTheDocument()
    expect(screen.getByText(`开始 ${fmtTime(BASE_TS - 66)} —`)).toBeInTheDocument()
  })

  it('DOING：无 focus_started_ts 时耗时显示 0s，开始时间占位', () => {
    render(<AITaskBoard columns={createColumns([createItem({ content: '执行任务', status: 'DOING' })])} />)
    expect(screen.getByText('耗时 0s')).toBeInTheDocument()
    expect(screen.getByText('开始 — —')).toBeInTheDocument()
  })

  it('DONE：展示开始—结束时间段与耗时', () => {
    render(
      <AITaskBoard
        columns={createColumns([
          createItem({
            content: '完成任务',
            status: 'DONE',
            focus_started_ts: BASE_TS - 120,
            closed_ts: BASE_TS,
            focus_seconds: 120,
          }),
        ])}
      />,
    )
    expect(screen.getByText('耗时 2m0s')).toBeInTheDocument()
    expect(screen.getByText(`开始 ${fmtTime(BASE_TS - 120)} — 结束 ${fmtTime(BASE_TS)}`)).toBeInTheDocument()
  })

  it('DONE：缺 closed_ts 时结束时间显示 —', () => {
    render(
      <AITaskBoard
        columns={createColumns([
          createItem({ content: '完成任务', status: 'DONE', focus_started_ts: BASE_TS - 60, focus_seconds: 60 }),
        ])}
      />,
    )
    expect(screen.getByText(`开始 ${fmtTime(BASE_TS - 60)} — 结束 —`)).toBeInTheDocument()
  })

  it('SKIPPED：展示存活时长与创建—跳过时间段', () => {
    render(
      <AITaskBoard
        columns={createColumns([
          createItem({
            content: '跳过任务',
            status: 'SKIPPED',
            closed_ts: BASE_TS,
            survival_seconds: 3600,
          }),
        ])}
      />,
    )
    expect(screen.getByText('存活 1h0s')).toBeInTheDocument()
    expect(screen.getByText(`创建 ${fmtTime(BASE_TS)} — 跳过 ${fmtTime(BASE_TS)}`)).toBeInTheDocument()
  })

  it('DELETED：展示存活时长与创建—删除时间段，卡片置灰', () => {
    render(
      <AITaskBoard
        columns={createColumns([
          createItem({
            content: '删除任务',
            status: 'DELETED',
            closed_ts: BASE_TS,
            age_seconds: 180,
          }),
        ])}
      />,
    )
    // survival_seconds 缺失时回退 age_seconds
    expect(screen.getByText('存活 3m0s')).toBeInTheDocument()
    expect(screen.getByText(`创建 ${fmtTime(BASE_TS)} — 删除 ${fmtTime(BASE_TS)}`)).toBeInTheDocument()
    const card = screen.getByText('删除任务').closest('.board-todo-card') as HTMLElement
    expect(card).toHaveClass('board-todo-card-muted')
  })

  it('存活时长回退顺序：survival_seconds > age_seconds > 墙钟推算', () => {
    render(
      <AITaskBoard
        columns={createColumns([
          createItem({
            content: '无秒数字段',
            status: 'SKIPPED',
            created_ts: BASE_TS - 7200,
            closed_ts: BASE_TS,
          }),
        ])}
      />,
    )
    // 无 survival/age：用 closed - created = 7200s
    expect(screen.getByText('存活 2h0s')).toBeInTheDocument()
  })
})

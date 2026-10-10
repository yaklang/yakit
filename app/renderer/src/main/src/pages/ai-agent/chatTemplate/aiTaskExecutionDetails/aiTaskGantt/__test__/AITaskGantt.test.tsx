import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { AIAgentGrpcApi } from '@/pages/ai-re-act/hooks/grpcApi'
import { AITaskGantt } from '../AITaskGantt'

// 类名原样返回，便于按 class 断言选中态与分段条类型
vi.mock('../AITaskGantt.module.scss', () => ({
  default: new Proxy({}, { get: (_, key) => (key === '__esModule' ? false : key) }),
}))

const BASE_TS = 1750000000

const createItem = (item: Partial<AIAgentGrpcApi.TodoListUpdateItem>): AIAgentGrpcApi.TodoListUpdateItem => ({
  id: 'todo-1',
  content: '待办内容',
  status: 'PENDING',
  created_at: 1,
  updated_at: 1,
  created_ts: BASE_TS,
  ...item,
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('AITaskGantt 渲染', () => {
  it('渲染每条待办的状态标签与分段条，且图例齐全', () => {
    const items = [
      createItem({ id: 't-pending', content: '排队任务', status: 'PENDING' }),
      createItem({ id: 't-doing', content: '执行任务', status: 'DOING', focus_started_ts: BASE_TS + 100 }),
      createItem({
        id: 't-done',
        content: '完成任务',
        status: 'DONE',
        focus_started_ts: BASE_TS + 100,
        closed_ts: BASE_TS + 700,
      }),
      createItem({ id: 't-skipped', content: '跳过任务', status: 'SKIPPED', closed_ts: BASE_TS + 300 }),
      createItem({ id: 't-deleted', content: '删除任务', status: 'DELETED', closed_ts: BASE_TS + 300 }),
    ]
    render(<AITaskGantt items={items} />)

    expect(screen.getByText('排队任务')).toBeInTheDocument()
    expect(screen.getByText('执行任务')).toBeInTheDocument()
    expect(screen.getByText('完成任务')).toBeInTheDocument()
    expect(screen.getByText('跳过任务')).toBeInTheDocument()
    expect(screen.getByText('删除任务')).toBeInTheDocument()

    // 状态标签
    expect(screen.getAllByText('待处理').length).toBeGreaterThan(0)
    expect(screen.getAllByText('运行中').length).toBeGreaterThan(0)
    expect(screen.getAllByText('已完成').length).toBeGreaterThan(0)
    expect(screen.getAllByText('已跳过').length).toBeGreaterThan(0)
    expect(screen.getAllByText('已删除').length).toBeGreaterThan(0)

    // 图例五类齐全
    for (const label of ['等待', '执行过程', '成功', '跳过', '失败']) {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0)
    }

    // 分段条按 kind 渲染出对应 class（CSS Module 测试环境按原名返回）
    const gantt = document.querySelector('.ai-task-gantt') as HTMLElement
    expect(gantt.querySelector('.bar-segment-wait')).not.toBeNull()
    expect(gantt.querySelector('.bar-segment-execute')).not.toBeNull()
    expect(gantt.querySelector('.bar-segment-success')).not.toBeNull()
    expect(gantt.querySelector('.bar-segment-skipped')).not.toBeNull()
    expect(gantt.querySelector('.bar-segment-failed')).not.toBeNull()
  })

  it('无有效时间戳的条目仍渲染行，但不生成分段条', () => {
    render(
      <AITaskGantt
        items={[createItem({ id: 't-legacy', content: '历史数据', created_ts: undefined, created_at: 5 })]}
      />,
    )
    expect(screen.getByText('历史数据')).toBeInTheDocument()
    const gantt = document.querySelector('.ai-task-gantt') as HTMLElement
    expect(gantt.querySelector('.bar-segment')).toBeNull()
  })

  it('items 为空时渲染默认时间窗与图例，恰好 5 个刻度（4 格）', () => {
    render(<AITaskGantt items={[]} />)
    const gantt = document.querySelector('.ai-task-gantt') as HTMLElement
    // 空数据：MIN=4 格 ×15min → 含起止共 5 个 tick
    expect(gantt.querySelectorAll('.timeline-tick')).toHaveLength(5)
    expect(screen.getByText('等待')).toBeInTheDocument()
  })

  it('窄跨度至少 5 个刻度；3 天宽跨度不超过 9 个刻度', () => {
    // 终态用 closed_ts 控跨度，避免 PENDING 拖到 Date.now()
    const { unmount } = render(
      <AITaskGantt
        items={[
          createItem({
            id: 'narrow',
            content: '窄跨度',
            status: 'DONE',
            created_ts: BASE_TS,
            focus_started_ts: BASE_TS,
            closed_ts: BASE_TS + 90,
          }),
        ]}
      />,
    )
    let gantt = document.querySelector('.ai-task-gantt') as HTMLElement
    expect(gantt.querySelectorAll('.timeline-tick').length).toBeGreaterThanOrEqual(5)
    unmount()

    render(
      <AITaskGantt
        items={[
          createItem({
            id: 'wide',
            content: '宽跨度',
            status: 'DONE',
            created_ts: BASE_TS,
            focus_started_ts: BASE_TS + 100,
            closed_ts: BASE_TS + 3 * 24 * 3600,
          }),
        ]}
      />,
    )
    gantt = document.querySelector('.ai-task-gantt') as HTMLElement
    expect(gantt.querySelectorAll('.timeline-tick').length).toBeLessThanOrEqual(9)
  })

  it('缺 id 的条目回退用行序号作为 key 渲染', () => {
    render(<AITaskGantt items={[createItem({ id: '', content: '匿名任务' })]} />)
    expect(screen.getByText('匿名任务')).toBeInTheDocument()
  })
})

describe('AITaskGantt 选中交互', () => {
  it('点击侧栏行选中并高亮，再点一次取消；时间轴行同样可选中', async () => {
    const user = userEvent.setup()
    const items = [
      createItem({ id: 't-a', content: '任务 A' }),
      createItem({ id: 't-b', content: '任务 B', status: 'DONE', closed_ts: BASE_TS + 100 }),
    ]
    render(<AITaskGantt items={items} />)

    const rowA = screen.getByText('任务 A').closest('.sidebar-item') as HTMLElement
    expect(rowA).toHaveClass('sidebar-item')
    expect(rowA).not.toHaveClass('sidebar-item-selected')

    await user.click(rowA)
    expect(rowA).toHaveClass('sidebar-item-selected')
    // 对应时间轴行同步高亮
    const timelineRowA = document.querySelector('.timeline-row-selected') as HTMLElement
    expect(timelineRowA).not.toBeNull()

    // 再次点击取消选中
    await user.click(rowA)
    expect(rowA).not.toHaveClass('sidebar-item-selected')
    expect(document.querySelector('.timeline-row-selected')).toBeNull()

    // 点击时间轴行同样可选中
    const rowB = screen.getByText('任务 B').closest('.sidebar-item') as HTMLElement
    await user.click(rowB)
    expect(rowB).toHaveClass('sidebar-item-selected')
  })

  it('点击行后 title 提示与分段条 kind 一致', async () => {
    const user = userEvent.setup()
    render(
      <AITaskGantt
        items={[
          createItem({
            id: 't-done',
            content: '完成任务',
            status: 'DONE',
            focus_started_ts: BASE_TS + 100,
            closed_ts: BASE_TS + 700,
          }),
        ]}
      />,
    )
    // DONE：wait + execute + success 三段
    const gantt = document.querySelector('.ai-task-gantt') as HTMLElement
    const segments = Array.from(gantt.querySelectorAll('.bar-segment')) as HTMLElement[]
    expect(segments.length).toBe(3)
    expect(segments[0].title).toBe('等待')
    expect(segments[1].title).toBe('执行过程')
    expect(segments[2].title).toBe('成功')

    await user.click(screen.getByText('完成任务'))
    expect(document.querySelector('.timeline-row-selected')).not.toBeNull()
  })
})

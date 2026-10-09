import type React from 'react'
import { VirtuosoMockContext } from 'react-virtuoso'
import type * as AhooksModule from 'ahooks'
import { act, cleanup, fireEvent, render as renderComponent, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '../../../ai-re-act/hooks/__test__/setupElectron'
import AIScheduledTasks from '../AIScheduledTasks'
import AIScheduledTasksList from '../AIScheduledTasksList'
import {
  grpcGetAIReActSchedule,
  grpcQueryAIReActSchedules,
  grpcRunAIReActScheduleNow,
  grpcSetAIReActScheduleEnabled,
} from '../utils'
import { showYakitModal } from '@/components/yakitUI/YakitModal/YakitModalConfirm'
import { waitForAISessionPush } from '../waitForAISessionPush'
import { grpcQueryAISession } from '../../grpc'
import { yakitNotify } from '@/utils/notification'
import emiter from '@/utils/eventBus/eventBus'
import type { AISession } from '../../type/aiChat'
import type { AIReActSchedule } from '@/pages/ai-re-act/hooks/grpcApi'

const render = (ui: React.ReactElement) =>
  renderComponent(
    <VirtuosoMockContext.Provider value={{ viewportHeight: 480, itemHeight: 104 }}>{ui}</VirtuosoMockContext.Provider>,
  )

const { setActiveChat } = vi.hoisted(() => ({ setActiveChat: vi.fn() }))
vi.mock('../../useContext/useDispatcher', () => ({ default: () => ({ setActiveChat }) }))
vi.mock('../../grpc', () => ({ grpcQueryAISession: vi.fn() }))
vi.mock('../waitForAISessionPush', () => ({ waitForAISessionPush: vi.fn() }))
vi.mock('../utils', () => ({
  grpcQueryAIReActSchedules: vi.fn(),
  grpcRunAIReActScheduleNow: vi.fn(),
  grpcDeleteAIReActSchedule: vi.fn(),
  grpcGetAIReActSchedule: vi.fn(),
  grpcSetAIReActScheduleEnabled: vi.fn(),
}))
vi.mock('../scheduledTasksForm/ScheduledTasksForm', () => ({ default: () => null }))
vi.mock('../aiScheduledTasksDetail/AIScheduledTasksDetail', () => ({
  default: ({
    initialSchedule,
    onRunNow,
    onClose,
  }: {
    initialSchedule: AIReActSchedule
    onRunNow: (item: AIReActSchedule) => void
    onClose: () => void
  }) => (
    <div role="dialog" aria-label="schedule detail">
      {initialSchedule.Name}:{initialSchedule.Status}:{initialSchedule.NextRunAt}
      <button onClick={() => onRunNow(initialSchedule)}>立即运行</button>
      <button onClick={onClose}>关闭详情</button>
    </div>
  ),
}))
vi.mock('@/utils/notification', () => ({ yakitNotify: vi.fn() }))
vi.mock('@/components/yakitUI/YakitModal/YakitModalConfirm', () => ({
  showYakitModal: vi.fn(),
  YakitModalConfirm: vi.fn(),
}))
vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({ t: (key: string) => key }),
}))
vi.mock('../../aiChatWelcome/AIChatWelcomeSideSetting', () => ({
  SideSettingButton: () => null,
}))
vi.mock('ahooks', async (importOriginal) => ({
  ...(await importOriginal<typeof AhooksModule>()),
  useInViewport: () => [true],
}))
const schedule: AIReActSchedule = {
  UUID: 'schedule-1',
  Name: 'scheduled task',
  Status: 'active',
  TargetMode: 'new_session_per_run',
  Payload: { Prompt: 'run task', StartParams: {} as AIReActSchedule['Payload']['StartParams'] },
  Schedule: { RRule: 'FREQ=DAILY', Timezone: 'UTC', StartAt: 0 },
}
const session: AISession = {
  Id: '1',
  SessionID: 'session-1',
  Title: 'scheduled session',
  question: '',
  CreatedAt: 1,
  UpdatedAt: 1,
  LastUsedAt: 1,
  TitleInitialized: true,
  Source: 'ai',
}
const pagination = { Page: 1, Limit: 1, OrderBy: 'last_used_at', Order: 'desc' }

const refreshHistory = vi.fn()

beforeEach(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  )
  vi.resetAllMocks()
  emiter.on('sessionData', refreshHistory)
  vi.mocked(grpcRunAIReActScheduleNow).mockResolvedValue(null)
  vi.mocked(waitForAISessionPush).mockResolvedValue(session.SessionID)
  vi.mocked(grpcQueryAISession).mockResolvedValue({ Data: [session], Total: 1, Pagination: pagination })
  vi.mocked(grpcQueryAIReActSchedules).mockResolvedValue({ Data: [schedule], Total: 1, Pagination: pagination })
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  emiter.off('sessionData', refreshHistory)
})

const runNow = async () => {
  // 只挂载任务列表，不挂载 HistoryChat，覆盖右侧历史浮层关闭时的实际调用路径。
  render(<AIScheduledTasks visible />)
  fireEvent.click(await screen.findByText(schedule.Name))
  fireEvent.click(screen.getByRole('button', { name: '立即运行' }))
}

describe('AIScheduledTasks 立即运行跳转', () => {
  it.each(['active', 'paused', 'completed'])('%s 状态可从列表立即运行且不打开详情', async (Status) => {
    const item = { ...schedule, UUID: 'list-run-' + Status, Status }
    vi.mocked(grpcQueryAIReActSchedules).mockResolvedValue({ Data: [item], Total: 1, Pagination: pagination })
    render(<AIScheduledTasks visible />)
    fireEvent.click(await screen.findByRole('button', { name: 'AIScheduledTasks.runNow' }))
    await waitFor(() => expect(setActiveChat).toHaveBeenCalledWith(session))
    expect(grpcRunAIReActScheduleNow).toHaveBeenCalledExactlyOnceWith({ UUID: item.UUID })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('历史面板未挂载时，按推送 ID 查询并激活任务会话', async () => {
    await runNow()
    await waitFor(() => expect(setActiveChat).toHaveBeenCalledWith(session))
    expect(grpcRunAIReActScheduleNow).toHaveBeenCalledWith({ UUID: schedule.UUID })
    expect(refreshHistory).toHaveBeenCalledExactlyOnceWith(
      JSON.stringify({ type: 'refresh', sessionId: session.SessionID }),
    )
    expect(grpcQueryAISession).toHaveBeenCalledWith(
      {
        Pagination: pagination,
        Filter: { SessionID: [session.SessionID] },
      },
      true,
    )
  })

  it('推送等待超时时，查询最新的本地 AI 会话并激活', async () => {
    vi.mocked(waitForAISessionPush).mockResolvedValue(undefined)
    await runNow()
    await waitFor(() => expect(setActiveChat).toHaveBeenCalledWith(session))
    expect(waitForAISessionPush).toHaveBeenCalledWith(2000)
    expect(refreshHistory).toHaveBeenCalledExactlyOnceWith(JSON.stringify({ type: 'refresh' }))
    expect(grpcQueryAISession).toHaveBeenCalledWith(
      {
        Pagination: pagination,
        Filter: { Source: ['ai', ''] },
      },
      true,
    )
  })

  it.each(['reject', 'empty', 'mismatch'])('会话查询失败时保留当前页面并提示已启动（%s）', async (failure) => {
    if (failure === 'reject') vi.mocked(grpcQueryAISession).mockRejectedValue(new Error('query failed'))
    else
      vi.mocked(grpcQueryAISession).mockResolvedValue({
        Data: failure === 'empty' ? [] : [{ ...session, SessionID: 'unrelated-session' }],
        Total: failure === 'empty' ? 0 : 1,
        Pagination: pagination,
      })
    await runNow()
    await waitFor(() => expect(yakitNotify).toHaveBeenCalledWith('warning', 'AIScheduledTasks.openRunSessionFailed'))
    expect(setActiveChat).not.toHaveBeenCalled()
    expect(yakitNotify).toHaveBeenCalledWith('success', 'AIScheduledTasks.runStarted')
    expect(refreshHistory).toHaveBeenCalledExactlyOnceWith(
      JSON.stringify({ type: 'refresh', sessionId: session.SessionID }),
    )
  })

  it('启动请求失败时不查询或切换会话', async () => {
    vi.mocked(grpcRunAIReActScheduleNow).mockRejectedValue(new Error('run failed'))
    await runNow()
    await waitFor(() => expect(grpcRunAIReActScheduleNow).toHaveBeenCalled())
    expect(waitForAISessionPush).not.toHaveBeenCalled()
    expect(grpcQueryAISession).not.toHaveBeenCalled()
    expect(setActiveChat).not.toHaveBeenCalled()
    expect(yakitNotify).not.toHaveBeenCalledWith('success', 'AIScheduledTasks.runStarted')
    expect(refreshHistory).not.toHaveBeenCalled()
  })
})

const responseFor = (data: AIReActSchedule[]) => ({ Data: data, Total: data.length, Pagination: pagination })
const disabledSchedule: AIReActSchedule = { ...schedule, UUID: 'disabled-1', Name: 'disabled task', Status: 'paused' }
const completedSchedule: AIReActSchedule = {
  ...schedule,
  UUID: 'completed-1',
  Name: 'completed task',
  Status: 'completed',
}
const group = (name: string) => screen.getByRole('region', { name: `AIScheduledTasks.${name}` })

describe('AIScheduledTasks 全量分组列表', () => {
  it('点击卡片才在右侧打开详情，再次点击或点击外部关闭', async () => {
    render(<AIScheduledTasks visible />)
    const card = await screen.findByText(schedule.Name)
    fireEvent.mouseOver(card)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    fireEvent.click(card)
    const detail = await screen.findByRole('dialog')
    expect(detail.closest('.ant-popover')).toHaveClass('ant-popover-placement-right')
    fireEvent.click(card)
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    fireEvent.click(card)
    await screen.findByRole('dialog')
    fireEvent.mouseDown(document.body)
    fireEvent.click(document.body)
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('切换任务只展示一份详情，点击详情内容不会关闭', async () => {
    vi.mocked(grpcQueryAIReActSchedules).mockResolvedValue(responseFor([schedule, disabledSchedule]))
    render(<AIScheduledTasks visible />)
    fireEvent.click(await screen.findByText(schedule.Name))
    fireEvent.click(await screen.findByRole('dialog'))
    expect(screen.getByRole('dialog')).toHaveTextContent(schedule.Name)
    fireEvent.mouseDown(screen.getByText(disabledSchedule.Name))
    fireEvent.click(screen.getByText(disabledSchedule.Name))
    await waitFor(() => expect(screen.getAllByRole('dialog')).toHaveLength(1))
    expect(screen.getByRole('dialog')).toHaveTextContent(disabledSchedule.Name)
  })

  it('列表项无需外部详情状态即可打开、关闭并重新打开详情', async () => {
    render(
      <AIScheduledTasksList
        data={[schedule]}
        loading={false}
        filtered={false}
        onClearFilter={vi.fn()}
        onAdd={vi.fn()}
        onSetData={vi.fn()}
        onRefresh={vi.fn()}
        onEdit={vi.fn()}
      />,
    )
    fireEvent.click(await screen.findByText(schedule.Name))
    await screen.findByRole('dialog')
    fireEvent.click(screen.getByRole('button', { name: '关闭详情' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    fireEvent.click(screen.getByText(schedule.Name))
    await screen.findByRole('dialog')
    const heading = within(group('runningGroup')).getByRole('button', { expanded: true })
    fireEvent.click(heading)
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    fireEvent.click(heading)
    await screen.findByText(schedule.Name)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('搜索结果移除任务时关闭该任务详情', async () => {
    vi.mocked(grpcQueryAIReActSchedules)
      .mockResolvedValueOnce(responseFor([schedule]))
      .mockResolvedValueOnce(responseFor([]))
    render(<AIScheduledTasks visible />)
    fireEvent.click(await screen.findByText(schedule.Name))
    await screen.findByRole('dialog')
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'missing' } })
    await screen.findByText('AIScheduledTasks.emptyFilteredTitle')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it.each(['RRULE:FREQ=MONTHLY;INTERVAL=2', 'RRULE:FREQ=DAILY;INTERVAL=2'])(
    '自定义规则 %s 仅在悬停标签时展示完整内容',
    async (rrule) => {
      vi.mocked(grpcQueryAIReActSchedules).mockResolvedValue(
        responseFor([{ ...schedule, Schedule: { ...schedule.Schedule, RRule: rrule } }]),
      )
      render(<AIScheduledTasks visible />)
      const tag = await screen.findByText('AIScheduledTasks.frequencyOptions.custom')
      expect(screen.queryByText(rrule)).not.toBeInTheDocument()
      fireEvent.mouseOver(tag)
      expect(await screen.findByRole('tooltip')).toHaveTextContent(rrule)
    },
  )

  it('预设规则保留周期文案，不显示自定义规则提示', async () => {
    render(<AIScheduledTasks visible />)
    const tag = await screen.findByText('AIScheduledTasks.frequencyDailyAtTime')
    expect(screen.queryByText('AIScheduledTasks.frequencyOptions.custom')).not.toBeInTheDocument()
    fireEvent.mouseOver(tag)
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
  })

  it('大量任务只挂载视口附近的卡片，折叠后释放卡片并可重新展开', async () => {
    const tasks = Array.from({ length: 1000 }, (_, index) => ({
      ...schedule,
      UUID: 'task-' + index,
      Name: 'virtual task ' + index,
    }))
    vi.mocked(grpcQueryAIReActSchedules).mockResolvedValue(responseFor(tasks))
    render(<AIScheduledTasks visible />)
    await screen.findByText('virtual task 0')
    expect(screen.getAllByText(/^virtual task /).length).toBeLessThan(20)
    expect(screen.queryByText('virtual task 999')).not.toBeInTheDocument()
    const heading = within(group('runningGroup')).getByRole('button', { expanded: true })
    expect(heading).toHaveTextContent('1000')
    fireEvent.click(heading)
    expect(screen.queryByText('virtual task 0')).not.toBeInTheDocument()
    fireEvent.click(heading)
    expect(await screen.findByText('virtual task 0')).toBeInTheDocument()
    expect(screen.getAllByText(/^virtual task /).length).toBeLessThan(20)
  })

  it('一次查询全部状态并按状态分组，显示数量且可独立折叠', async () => {
    const secondActive = { ...schedule, UUID: 'active-2', Name: 'second active task' }
    vi.mocked(grpcQueryAIReActSchedules).mockResolvedValue(
      responseFor([disabledSchedule, schedule, completedSchedule, secondActive]),
    )
    render(<AIScheduledTasks visible />)
    await screen.findByText(schedule.Name)
    expect(vi.mocked(grpcQueryAIReActSchedules).mock.calls[0][0]).toMatchObject({
      Pagination: { Page: 1, Limit: -1 },
      Filter: { Status: [], Keyword: '' },
    })
    expect(within(group('runningGroup')).getByText(schedule.Name)).toBeInTheDocument()
    expect(within(group('runningGroup')).getByText(secondActive.Name)).toBeInTheDocument()
    expect(within(group('disabledGroup')).getByText(disabledSchedule.Name)).toBeInTheDocument()
    expect(within(group('completed')).getByText(completedSchedule.Name)).toBeInTheDocument()
    expect(within(group('completed')).queryByRole('switch')).not.toBeInTheDocument()
    const heading = within(group('runningGroup')).getByRole('button', { expanded: true })
    expect(heading).toHaveTextContent('2')
    fireEvent.click(heading)
    expect(heading).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByText(schedule.Name)).not.toBeInTheDocument()
    expect(screen.getByText(disabledSchedule.Name)).toBeVisible()
    fireEvent.click(heading)
    expect(await screen.findByText(schedule.Name)).toBeInTheDocument()
    expect(grpcQueryAIReActSchedules).toHaveBeenCalledTimes(1)
  })

  it('空状态分组不展示', async () => {
    render(<AIScheduledTasks visible />)
    await screen.findByText(schedule.Name)
    expect(group('runningGroup')).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'AIScheduledTasks.disabledGroup' })).not.toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'AIScheduledTasks.completed' })).not.toBeInTheDocument()
  })

  it.each([
    { item: schedule, action: 'pause', enabled: false, destination: 'disabledGroup', status: 'paused' },
    { item: disabledSchedule, action: 'resume', enabled: true, destination: 'runningGroup', status: 'active' },
  ])('$action 成功后移组并关闭旧列表项详情，不重新查询列表', async ({ item, action, enabled, destination, status }) => {
    const latest = { ...item, Status: status, Name: 'server updated task', NextRunAt: 1791451800 }
    vi.mocked(grpcQueryAIReActSchedules).mockResolvedValue(responseFor([item]))
    vi.mocked(grpcSetAIReActScheduleEnabled).mockResolvedValue(latest)
    render(<AIScheduledTasks visible />)
    fireEvent.click(await screen.findByText(item.Name))
    expect(screen.getByRole('dialog')).toHaveTextContent(`${item.Name}:${item.Status}`)
    fireEvent.click(screen.getByRole('switch', { name: `AIScheduledTasks.${action}` }))
    await waitFor(() => expect(within(group(destination)).getByText(latest.Name)).toBeInTheDocument())
    expect(grpcSetAIReActScheduleEnabled).toHaveBeenCalledWith({ UUID: item.UUID, Enabled: enabled })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    fireEvent.click(within(group(destination)).getByText(latest.Name))
    expect(screen.getByRole('dialog')).toHaveTextContent(`${latest.Name}:${status}:${latest.NextRunAt}`)
    expect(screen.queryByText(item.Name)).not.toBeInTheDocument()
    expect(grpcQueryAIReActSchedules).toHaveBeenCalledTimes(1)
  })

  it('任务移入已折叠分组后关闭详情，展开分组不会自动重开', async () => {
    vi.mocked(grpcQueryAIReActSchedules).mockResolvedValue(responseFor([schedule, disabledSchedule]))
    vi.mocked(grpcSetAIReActScheduleEnabled).mockResolvedValue({ ...schedule, Status: 'paused' })
    render(<AIScheduledTasks visible />)
    await screen.findByText(schedule.Name)
    fireEvent.click(within(group('disabledGroup')).getByRole('button', { expanded: true }))
    fireEvent.click(screen.getByText(schedule.Name))
    await screen.findByRole('dialog')
    fireEvent.click(screen.getByRole('switch', { name: 'AIScheduledTasks.pause' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    fireEvent.click(within(group('disabledGroup')).getByRole('button', { expanded: false }))
    await screen.findByText(schedule.Name)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it.each(['success', 'failure'])('启停期间以加载图标替换开关，%s 后恢复', async (outcome) => {
    let finish!: () => void
    vi.mocked(grpcSetAIReActScheduleEnabled).mockImplementation(
      () =>
        new Promise((resolve, reject) => {
          finish = () =>
            outcome === 'success' ? resolve({ ...schedule, Status: 'paused' }) : reject(new Error('toggle failed'))
        }),
    )
    render(<AIScheduledTasks visible />)
    fireEvent.click(await screen.findByRole('switch', { name: 'AIScheduledTasks.pause' }))
    const loading = screen.getByRole('status', { name: 'YakitSpin.loading' })
    expect(screen.queryByRole('switch')).not.toBeInTheDocument()
    fireEvent.click(loading)
    expect(grpcSetAIReActScheduleEnabled).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await act(async () => finish())
    expect(screen.queryByRole('status', { name: 'YakitSpin.loading' })).not.toBeInTheDocument()
    expect(
      screen.getByRole('switch', {
        name: outcome === 'success' ? 'AIScheduledTasks.resume' : 'AIScheduledTasks.pause',
      }),
    ).toBeInTheDocument()
  })
  it('启停请求失败保留原分组，点击开关不打开详情', async () => {
    vi.mocked(grpcSetAIReActScheduleEnabled).mockRejectedValue(new Error('toggle failed'))
    render(<AIScheduledTasks visible />)
    fireEvent.click(await screen.findByRole('switch', { name: 'AIScheduledTasks.pause' }))
    await waitFor(() => expect(grpcSetAIReActScheduleEnabled).toHaveBeenCalledTimes(1))
    expect(within(group('runningGroup')).getByText(schedule.Name)).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'AIScheduledTasks.disabledGroup' })).not.toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('搜索输入立即更新，连续输入仅在 500ms 后查询最终关键词', async () => {
    render(<AIScheduledTasks visible />)
    await screen.findByText(schedule.Name)
    const search = screen.getByRole('textbox')
    fireEvent.change(search, { target: { value: 'first' } })
    expect(search).toHaveValue('first')
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 250))
    })
    fireEvent.change(search, { target: { value: 'final' } })
    expect(search).toHaveValue('final')
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 350))
    })
    expect(grpcQueryAIReActSchedules).toHaveBeenCalledTimes(1)
    await waitFor(() => expect(grpcQueryAIReActSchedules).toHaveBeenCalledTimes(2))
    expect(vi.mocked(grpcQueryAIReActSchedules).mock.calls[1][0]).toMatchObject({
      Pagination: { Page: 1, Limit: -1 },
      Filter: { Status: [], Keyword: 'final' },
    })
  })

  it('旧查询晚返回时不覆盖较新搜索结果', async () => {
    let resolveOld!: (value: ReturnType<typeof responseFor>) => void
    vi.mocked(grpcQueryAIReActSchedules)
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveOld = resolve
          }),
      )
      .mockResolvedValueOnce(responseFor([disabledSchedule]))
    render(<AIScheduledTasks visible />)
    await waitFor(() => expect(grpcQueryAIReActSchedules).toHaveBeenCalledTimes(1))
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'disabled' } })
    await screen.findByText(disabledSchedule.Name)
    await act(async () => {
      resolveOld(responseFor([schedule]))
    })
    expect(screen.getByText(disabledSchedule.Name)).toBeInTheDocument()
    expect(screen.queryByText(schedule.Name)).not.toBeInTheDocument()
  })

  it('区分全库为空和搜索无结果，清空搜索后恢复全部任务', async () => {
    vi.mocked(grpcQueryAIReActSchedules)
      .mockResolvedValueOnce(responseFor([]))
      .mockResolvedValueOnce(responseFor([]))
      .mockResolvedValueOnce(responseFor([schedule]))
    render(<AIScheduledTasks visible />)
    await screen.findByText('AIScheduledTasks.emptyTitle')
    await waitFor(() => expect(grpcQueryAIReActSchedules).toHaveBeenCalledTimes(1))
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'missing' } })
    await screen.findByText('AIScheduledTasks.emptyFilteredTitle')
    await waitFor(() => expect(grpcQueryAIReActSchedules).toHaveBeenCalledTimes(2))
    fireEvent.click(screen.getByRole('button', { name: 'AIScheduledTasks.clearFilter' }))
    await screen.findByText(schedule.Name)
    expect(screen.getByRole('textbox')).toHaveValue('')
    expect(screen.getByText(schedule.Name)).toBeInTheDocument()
    expect(vi.mocked(grpcQueryAIReActSchedules).mock.lastCall?.[0].Filter?.Keyword).toBe('')
  })

  it('编辑成功只更新该任务，同时刷新已打开的详情', async () => {
    const updated = { ...schedule, Name: 'edited task' }
    vi.mocked(grpcGetAIReActSchedule).mockResolvedValue(updated)
    vi.mocked(showYakitModal).mockReturnValue({ destroy: vi.fn() } as ReturnType<typeof showYakitModal>)
    render(<AIScheduledTasks visible />)
    fireEvent.click(await screen.findByText(schedule.Name))
    fireEvent.click(screen.getByRole('button', { name: 'YakitButton.edit' }))
    const modal = vi.mocked(showYakitModal).mock.calls[0][0]
    const form = modal.content as React.ReactElement<{ onSuccess: () => void }>
    await act(async () => form.props.onSuccess())
    expect(grpcGetAIReActSchedule).toHaveBeenCalledWith({ UUID: schedule.UUID }, true)
    expect(within(group('runningGroup')).getByText(updated.Name)).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toHaveTextContent(`${updated.Name}:active`)
    expect(grpcQueryAIReActSchedules).toHaveBeenCalledTimes(1)
  })
})

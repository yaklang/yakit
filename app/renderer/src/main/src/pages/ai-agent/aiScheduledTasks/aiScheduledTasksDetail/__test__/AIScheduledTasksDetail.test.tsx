import userEvent from '@testing-library/user-event'
import { render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
// 先注册 electron stub，避免 '../utils' 顶层 window.require('electron') 报错
import '../../../../ai-re-act/hooks/__test__/setupElectron'
import AIScheduledTasksDetail from '../AIScheduledTasksDetail'
import type { AIReActSchedule } from '@/pages/ai-re-act/hooks/grpcApi'
import type { AISession } from '../../../type/aiChat'

const mockGetAIReActSchedule = vi.fn()
const mockQueryAISession = vi.fn()
const mockSetSetting = vi.fn()
const mockSetActiveChat = vi.fn()

vi.mock('../../utils', () => ({
  grpcGetAIReActSchedule: (...args: unknown[]) => mockGetAIReActSchedule(...args),
  grpcDeleteAIReActSchedule: vi.fn(),
  grpcSetAIReActScheduleEnabled: vi.fn(),
}))

vi.mock('../../../grpc', () => ({
  grpcQueryAISession: (...args: unknown[]) => mockQueryAISession(...args),
}))

vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({ t: (key: string) => key }),
}))

vi.mock('../../../useContext/useDispatcher', () => ({
  default: () => ({ setSetting: mockSetSetting, setActiveChat: mockSetActiveChat }),
}))

const makeSchedule = (overrides: Partial<AIReActSchedule> = {}): AIReActSchedule => ({
  UUID: 'u-1',
  Name: 'old-name',
  Status: 'active',
  TargetMode: 'new_session_per_run',
  Payload: {
    Prompt: 'old-prompt',
    StartParams: {} as AIReActSchedule['Payload']['StartParams'],
  },
  Schedule: { RRule: 'RRULE:FREQ=DAILY;INTERVAL=1', Timezone: 'UTC', StartAt: 0 },
  ...overrides,
})

const makeProps = (initialSchedule: AIReActSchedule) => ({
  initialSchedule,
  onClose: vi.fn(),
  onDataChange: vi.fn(),
})

describe('AIScheduledTasksDetail 数据同步', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetAIReActSchedule.mockReset()
    mockQueryAISession.mockReset()
    mockSetSetting.mockReset()
    mockSetActiveChat.mockReset()
  })

  it('详情为纯 prop 视图：直接展示 initialSchedule，挂载不发起拉取与回写', () => {
    const onDataChange = vi.fn()
    render(<AIScheduledTasksDetail {...makeProps(makeSchedule())} onDataChange={onDataChange} />)

    expect(screen.getByText('old-name')).toBeInTheDocument()
    expect(screen.getByText('old-prompt')).toBeInTheDocument()
    expect(mockGetAIReActSchedule).not.toHaveBeenCalled()
    expect(onDataChange).not.toHaveBeenCalled()
  })

  it('编辑保存/行内启停后（initialSchedule 刷新）详情同步展示最新数据', async () => {
    const { rerender } = render(<AIScheduledTasksDetail {...makeProps(makeSchedule())} />)
    expect(screen.getByText('old-name')).toBeInTheDocument()

    const updated = makeSchedule({
      Name: 'new-name',
      Payload: { ...makeSchedule().Payload, Prompt: 'new-prompt' },
    })
    rerender(<AIScheduledTasksDetail {...makeProps(updated)} />)

    await waitFor(() => {
      expect(screen.getByText('new-name')).toBeInTheDocument()
      expect(screen.getByText('new-prompt')).toBeInTheDocument()
    })
    expect(screen.queryByText('old-name')).not.toBeInTheDocument()
    expect(screen.queryByText('old-prompt')).not.toBeInTheDocument()
  })

  it('仅修改 Prompt 时同步刷新「原始请求」区块显隐', async () => {
    const sameAsOriginal = makeSchedule({
      OriginalRequest: 'orig-text',
      Payload: { ...makeSchedule().Payload, Prompt: 'orig-text' },
    })
    const { rerender } = render(<AIScheduledTasksDetail {...makeProps(sameAsOriginal)} />)
    // Prompt 与 OriginalRequest 相同 → 区块隐藏
    expect(screen.queryByText('AIScheduledTasks.originalRequest')).not.toBeInTheDocument()

    const editedPrompt = makeSchedule({
      OriginalRequest: 'orig-text',
      Payload: { ...makeSchedule().Payload, Prompt: 'edited-prompt' },
    })
    rerender(<AIScheduledTasksDetail {...makeProps(editedPrompt)} />)

    await waitFor(() => expect(screen.getByText('AIScheduledTasks.originalRequest')).toBeInTheDocument())
    expect(screen.getByText('orig-text')).toBeInTheDocument()
  })

  it('启停使用接口返回记录立即刷新详情并通知父组件', async () => {
    const { grpcSetAIReActScheduleEnabled } = await import('../../utils')
    const latest = makeSchedule({ Name: 'after-toggle-name', Status: 'paused' })
    vi.mocked(grpcSetAIReActScheduleEnabled).mockResolvedValue(latest)
    const onDataChange = vi.fn()
    render(<AIScheduledTasksDetail {...makeProps(makeSchedule())} onDataChange={onDataChange} />)

    await userEvent.click(screen.getByRole('switch', { name: 'AIScheduledTasks.pause' }))
    await waitFor(() => expect(onDataChange).toHaveBeenCalledWith(latest))
    expect(grpcSetAIReActScheduleEnabled).toHaveBeenCalledWith({ UUID: 'u-1', Enabled: false })
    expect(mockGetAIReActSchedule).not.toHaveBeenCalled()
    expect(screen.getByText('after-toggle-name')).toBeInTheDocument()
    expect(screen.getByRole('switch', { name: 'AIScheduledTasks.resume' })).not.toBeChecked()
    expect(screen.queryByText('AIScheduledTasks.nextRun')).not.toBeInTheDocument()
  })

  it.each(['active', 'paused', 'completed'])('%s 状态正确显示开关和下次执行', (status) => {
    render(<AIScheduledTasksDetail {...makeProps(makeSchedule({ Status: status }))} />)
    expect(screen.queryByRole('switch') !== null).toBe(status !== 'completed')
    expect(screen.queryByText('AIScheduledTasks.nextRun') !== null).toBe(status === 'active')
    expect(screen.getByText('AIScheduledTasks.executionCycle')).toBeInTheDocument()
    expect(screen.queryByText('AIScheduledTasks.timezone')).not.toBeInTheDocument()
    expect(screen.queryByText('AIScheduledTasks.taskIntro')).not.toBeInTheDocument()
    expect(screen.queryByText('AIScheduledTasks.runNow')).not.toBeInTheDocument()
  })

  it('编辑传递当前任务', async () => {
    const schedule = makeSchedule()
    const onEdit = vi.fn()
    render(<AIScheduledTasksDetail {...makeProps(schedule)} onEdit={onEdit} />)
    await userEvent.click(screen.getByRole('button', { name: 'YakitButton.edit' }))
    expect(onEdit).toHaveBeenCalledWith(schedule)
  })

  it('保留最近执行结果、错误及停止原因', () => {
    render(
      <AIScheduledTasksDetail
        {...makeProps(
          makeSchedule({
            Status: 'paused',
            LastOutcome: 'failed',
            LastError: 'execution failed',
            PauseReason: 'paused by system',
            LastStartedAt: 1700000000,
            LastFinishedAt: 1700000060,
          }),
        )}
      />,
    )
    expect(screen.getByText('AIScheduledTasks.outcome.failed')).toBeInTheDocument()
    expect(screen.getByText('execution failed')).toBeInTheDocument()
    expect(screen.getByText('paused by system')).toBeInTheDocument()
  })

  it.each([undefined, 0, 1700000000])('LastRunAt=%s 时可打开关联会话并恢复 SingleModelMode', async (LastRunAt) => {
    const related = {
      SessionID: 'sess-linked',
      Title: 'linked-chat',
      Source: 'ai',
      StartParams: { SingleModelMode: true, EnablePlan: true },
    } as AISession
    mockQueryAISession.mockResolvedValue({ Data: [related] })

    render(
      <AIScheduledTasksDetail
        {...makeProps(
          makeSchedule({
            TargetMode: 'continue_session',
            TargetSessionID: 'sess-linked',
            LastRunAt,
          }),
        )}
      />,
    )

    await waitFor(() => expect(mockQueryAISession).toHaveBeenCalled())
    await waitFor(() => expect(screen.getByTitle('linked-chat')).toBeInTheDocument())

    const openBtn = screen.getByRole('button', { name: 'AIScheduledTasks.openChat' })
    if (LastRunAt) {
      const recentExecutionHeader = screen.getByText('AIScheduledTasks.lastExecution').parentElement!
      expect(within(recentExecutionHeader).getByRole('button', { name: 'AIScheduledTasks.openChat' })).toBe(openBtn)
    } else {
      expect(screen.queryByText('AIScheduledTasks.lastExecution')).not.toBeInTheDocument()
      expect(screen.getByTitle('linked-chat').parentElement).toContainElement(openBtn)
    }
    expect(screen.queryByRole('button', { name: 'linked-chat' })).not.toBeInTheDocument()
    await userEvent.click(openBtn)

    await waitFor(() => expect(mockSetSetting).toHaveBeenCalled())
    const updater = mockSetSetting.mock.calls[0][0] as (old: Record<string, unknown>) => Record<string, unknown>
    expect(updater({ SingleModelMode: false })).toMatchObject({
      SingleModelMode: true,
      EnablePlan: true,
    })
    expect(mockSetActiveChat).toHaveBeenCalledWith(related)
  })

  it('关联会话不存在时不显示跳转入口', async () => {
    mockQueryAISession.mockResolvedValue({ Data: [] })
    render(
      <AIScheduledTasksDetail
        {...makeProps(makeSchedule({ TargetMode: 'continue_session', TargetSessionID: 'missing-session' }))}
      />,
    )

    await waitFor(() => expect(mockQueryAISession).toHaveBeenCalled())
    expect(screen.queryByRole('button', { name: 'AIScheduledTasks.openChat' })).not.toBeInTheDocument()
    expect(mockSetActiveChat).not.toHaveBeenCalled()
  })
})

describe('AIScheduledTasksDetail 立即运行', () => {
  it.each(['active', 'paused', 'completed'])('%s 状态可以从详情立即运行', async (Status) => {
    const schedule = makeSchedule({ Status })
    const onRunNow = vi.fn()
    render(<AIScheduledTasksDetail {...makeProps(schedule)} onRunNow={onRunNow} />)
    await userEvent.click(screen.getByRole('button', { name: 'AIScheduledTasks.runNow' }))
    expect(onRunNow).toHaveBeenCalledExactlyOnceWith(schedule)
  })
})

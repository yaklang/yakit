import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ipcRendererMock, resetIpcMocks } from '../../../../ai-re-act/hooks/__test__/setupElectron'
import { AIAgentSettingDefault } from '../../../defaultConstant'
import {
  grpcCreateAIReActSchedule,
  grpcGetAIReActSchedule,
  grpcPreviewAIReActScheduleTimes,
  grpcUpdateAIReActSchedule,
} from '../../utils'
import ScheduledTasksForm from '../ScheduledTasksForm'

const { getSetting } = vi.hoisted(() => ({ getSetting: vi.fn() }))

vi.mock('../../../useContext/useDispatcher', () => ({ default: () => ({ getSetting }) }))
vi.mock('../../utils', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  grpcCreateAIReActSchedule: vi.fn(),
  grpcUpdateAIReActSchedule: vi.fn(),
  grpcPreviewAIReActScheduleTimes: vi.fn(),
}))
vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({ t: (key: string) => key }),
}))
vi.mock('@/utils/notification', () => ({ yakitNotify: vi.fn() }))
vi.mock('lottie-web', () => ({ default: vi.fn() }))

beforeEach(() => {
  vi.clearAllMocks()
  resetIpcMocks()
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockImplementation(() => ({
      matches: false,
      addListener: vi.fn(),
      removeListener: vi.fn(),
    })),
  )
  getSetting.mockReturnValue({ ...AIAgentSettingDefault })
  vi.mocked(grpcPreviewAIReActScheduleTimes).mockResolvedValue({ Timestamps: [] })
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('ScheduledTasksForm 保存运行时上下文参数', () => {
  it.each([
    { limit: 300, expected: 307200 },
    { limit: undefined, expected: 0 },
  ])('新建任务将 $limit KB 保存为 $expected 字节', async ({ limit, expected }) => {
    getSetting.mockReturnValue({
      ...AIAgentSettingDefault,
      RuntimeContextSizeLimit: limit,
      AICallAutoRetry: 7,
    })
    const onSuccess = vi.fn()
    render(<ScheduledTasksForm onClose={vi.fn()} onSuccess={onSuccess} />)
    fireEvent.change(screen.getByPlaceholderText('AIScheduledTasks.namePlaceholder'), {
      target: { value: 'new task' },
    })
    fireEvent.change(screen.getByPlaceholderText('AIScheduledTasks.promptPlaceholder'), {
      target: { value: 'run task' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'AIScheduledTasks.save' }))

    await waitFor(() => expect(grpcCreateAIReActSchedule).toHaveBeenCalledTimes(1))
    const [{ Schedule: schedule }, hiddenError] = vi.mocked(grpcCreateAIReActSchedule).mock.calls[0]
    expect(hiddenError).toBe(true)
    expect(schedule.Name).toBe('new task')
    expect(schedule.Payload.StartParams).toMatchObject({
      RuntimeContextSizeLimit: expected,
      AICallAutoRetry: 7,
      ReviewPolicy: 'yolo',
      DisallowRequireForUserPrompt: true,
      AllowPlanUserInteract: false,
      UserQuery: '',
    })
    expect(grpcUpdateAIReActSchedule).not.toHaveBeenCalled()
    expect(onSuccess).toHaveBeenCalledTimes(1)
  })

  it.each(['307200', undefined])('编辑任务仅修改名称时保留服务端字节阈值 %s', async (limit) => {
    const startParams = {
      ...AIAgentSettingDefault,
      TimelineContentSizeLimit: 123,
      RuntimeContextSizeLimit: limit,
      AICallAutoRetry: 7,
    }
    const response = {
      UUID: 'schedule-1',
      Name: 'original task',
      Status: 'active',
      TargetMode: 'new_session_per_run',
      Payload: {
        Prompt: 'run task',
        StartParams: startParams,
      },
      Schedule: { RRule: 'RRULE:FREQ=DAILY;INTERVAL=1', Timezone: 'UTC', StartAt: 1800000000 },
    }
    ipcRendererMock.invoke.mockResolvedValue(response)
    const editing = await grpcGetAIReActSchedule({ UUID: response.UUID })
    expect(editing.Payload.StartParams.RuntimeContextSizeLimit).toBe(Number(limit ?? 0))
    const onSuccess = vi.fn()
    render(<ScheduledTasksForm editing={editing} onClose={vi.fn()} onSuccess={onSuccess} />)
    fireEvent.change(screen.getByPlaceholderText('AIScheduledTasks.namePlaceholder'), {
      target: { value: 'renamed task' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'AIScheduledTasks.save' }))

    await waitFor(() => expect(grpcUpdateAIReActSchedule).toHaveBeenCalledTimes(1))
    const [{ Schedule: schedule }] = vi.mocked(grpcUpdateAIReActSchedule).mock.calls[0]
    expect(schedule.Name).toBe('renamed task')
    expect(schedule.UUID).toBe(editing.UUID)
    expect(schedule.Payload.Prompt).toBe(editing.Payload.Prompt)
    expect(schedule.Schedule).toEqual(editing.Schedule)
    expect(schedule.Payload.StartParams).toMatchObject({
      RuntimeContextSizeLimit: Number(limit ?? 0),
      AICallAutoRetry: 7,
    })
    expect(schedule.Payload.StartParams).not.toHaveProperty('TimelineContentSizeLimit')
    expect(startParams.TimelineContentSizeLimit).toBe(123)
    expect(startParams.RuntimeContextSizeLimit).toBe(limit)
    expect(getSetting).not.toHaveBeenCalled()
    expect(grpcCreateAIReActSchedule).not.toHaveBeenCalled()
    expect(onSuccess).toHaveBeenCalledTimes(1)
  })
})

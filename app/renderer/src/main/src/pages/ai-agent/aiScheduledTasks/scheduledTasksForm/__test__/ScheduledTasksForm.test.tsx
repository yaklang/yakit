import React from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ipcRendererMock } from '../../../../ai-re-act/hooks/__test__/setupElectron'

const { getSetting } = vi.hoisted(() => ({ getSetting: vi.fn() }))

vi.mock('../../../useContext/useDispatcher', () => ({ default: () => ({ getSetting }) }))
vi.mock('../../utils', async () => ({
  ...(await vi.importActual<Record<string, unknown>>('../../utils')),
  grpcCreateAIReActSchedule: vi.fn(),
  grpcUpdateAIReActSchedule: vi.fn(),
  grpcPreviewAIReActScheduleTimes: vi.fn(),
}))
vi.mock('@/i18n/useI18nNamespaces', () => ({ useI18nNamespaces: () => ({ t: (key: string) => key }) }))
vi.mock('@/utils/notification', () => ({ yakitNotify: vi.fn() }))
vi.mock('lottie-web', () => ({ default: vi.fn() }))
vi.mock('@/pages/ai-re-act/hooks/ChatMultiSessionController', () => ({ globalSessionEngine: {} }))
vi.mock('@/pages/yakRunner/utils', () => ({ isYaklangScriptDeliveryPath: vi.fn() }))

import { AIAgentSettingDefault } from '../../../defaultConstant'
import {
  grpcCreateAIReActSchedule,
  grpcGetAIReActSchedule,
  grpcPreviewAIReActScheduleTimes,
  grpcUpdateAIReActSchedule,
} from '../../utils'
import ScheduledTasksForm from '../ScheduledTasksForm'

beforeEach(() => {
  vi.clearAllMocks()
  getSetting.mockReturnValue({ ...AIAgentSettingDefault })
  vi.mocked(grpcPreviewAIReActScheduleTimes).mockResolvedValue({ Timestamps: [] })
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({ matches: false, addListener: vi.fn(), removeListener: vi.fn() })),
  )
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('schedule form runtime context units', () => {
  it.each([
    { limit: 300, expected: 307200 },
    { limit: undefined, expected: 0 },
  ])('creates a task with $expected bytes from UI value $limit', async ({ limit, expected }) => {
    getSetting.mockReturnValue({ ...AIAgentSettingDefault, RuntimeContextSizeLimit: limit, AICallAutoRetry: 7 })
    const onSuccess = vi.fn()
    render(<ScheduledTasksForm onClose={vi.fn()} onSuccess={onSuccess} />)
    fireEvent.change(screen.getByPlaceholderText('AIScheduledTasks.namePlaceholder'), { target: { value: 'New task' } })
    fireEvent.change(screen.getByPlaceholderText('AIScheduledTasks.promptPlaceholder'), {
      target: { value: 'Analyse' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'AIScheduledTasks.save' }))
    await waitFor(() => expect(grpcCreateAIReActSchedule).toHaveBeenCalledTimes(1))
    const [{ Schedule: schedule }] = vi.mocked(grpcCreateAIReActSchedule).mock.calls[0]
    expect(schedule.Payload.StartParams).toMatchObject({ RuntimeContextSizeLimit: expected, AICallAutoRetry: 7 })
    expect(schedule.Payload.StartParams).not.toHaveProperty('TimelineContentSizeLimit')
    expect(grpcUpdateAIReActSchedule).not.toHaveBeenCalled()
  })

  it.each(['307200', undefined])('keeps saved byte value %s when only renaming a task', async (limit) => {
    const original = {
      UUID: 'schedule-1',
      Name: 'Original',
      Status: 'active',
      TargetMode: 'new_session_per_run',
      Payload: {
        Prompt: 'Analyse',
        StartParams: { RuntimeContextSizeLimit: limit, TimelineContentSizeLimit: 61440, AICallAutoRetry: 7 },
      },
      Schedule: { RRule: 'RRULE:FREQ=DAILY;INTERVAL=1', Timezone: 'UTC', StartAt: 1800000000 },
    }
    ipcRendererMock.invoke.mockResolvedValue(original)
    const editing = await grpcGetAIReActSchedule({ UUID: original.UUID }, true)
    render(<ScheduledTasksForm editing={editing} onClose={vi.fn()} onSuccess={vi.fn()} />)
    fireEvent.change(screen.getByPlaceholderText('AIScheduledTasks.namePlaceholder'), { target: { value: 'Renamed' } })
    fireEvent.click(screen.getByRole('button', { name: 'AIScheduledTasks.save' }))
    await waitFor(() => expect(grpcUpdateAIReActSchedule).toHaveBeenCalledTimes(1))
    const [{ Schedule: schedule }] = vi.mocked(grpcUpdateAIReActSchedule).mock.calls[0]
    expect(schedule.Payload.StartParams.RuntimeContextSizeLimit).toBe(Number(limit ?? 0))
    expect(schedule.Payload.StartParams).not.toHaveProperty('TimelineContentSizeLimit')
    expect(schedule.Payload.StartParams.AICallAutoRetry).toBe(7)
    expect(schedule.Schedule).toEqual(original.Schedule)
    expect(original.Payload.StartParams.RuntimeContextSizeLimit).toBe(limit)
    expect(getSetting).not.toHaveBeenCalled()
    expect(grpcCreateAIReActSchedule).not.toHaveBeenCalled()
  })
})

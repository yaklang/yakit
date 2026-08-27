import { describe, expect, it, vi, beforeEach } from 'vitest'
import { ipcRendererMock, resetIpcMocks } from '../../../ai-re-act/hooks/__test__/setupElectron'
import { yakitNotify } from '@/utils/notification'
import {
  grpcCreateAIReActSchedule,
  grpcDeleteAIReActSchedule,
  grpcGetAIReActSchedule,
  grpcPreviewAIReActScheduleTimes,
  grpcQueryAIReActSchedules,
  grpcRunAIReActScheduleNow,
  grpcSetAIReActScheduleEnabled,
  grpcUpdateAIReActSchedule,
} from '../utils'

vi.mock('@/utils/notification', () => ({
  yakitNotify: vi.fn(),
}))

const mockedNotify = vi.mocked(yakitNotify)

/** 分页查询入参构造 */
const queryReq = (extra: Record<string, unknown> = {}) => ({
  Pagination: { Page: 1, Limit: 10 },
  Filter: { Status: ['active'] },
  ...extra,
})

describe('AI 定时任务 grpc 封装：IPC 通道与参数透传', () => {
  beforeEach(() => {
    resetIpcMocks()
    mockedNotify.mockClear()
  })

  it('grpcCreateAIReActSchedule 走 CreateAIReActSchedule 通道并回传结果', async () => {
    const schedule = { UUID: '', Name: 'n', Status: 'active', TargetMode: 'new_session_per_run' }
    ipcRendererMock.invoke.mockResolvedValue(schedule)

    await expect(grpcCreateAIReActSchedule({ Schedule: schedule as never })).resolves.toBe(schedule)
    expect(ipcRendererMock.invoke).toHaveBeenCalledWith('CreateAIReActSchedule', { Schedule: schedule })
  })

  it('grpcUpdateAIReActSchedule / grpcSetAIReActScheduleEnabled 走各自通道', async () => {
    const schedule = { UUID: 'u1', Name: 'n', Status: 'active', TargetMode: 'new_session_per_run' }
    await grpcUpdateAIReActSchedule({ Schedule: schedule as never })
    expect(ipcRendererMock.invoke).toHaveBeenCalledWith('UpdateAIReActSchedule', { Schedule: schedule })

    await grpcSetAIReActScheduleEnabled({ UUID: 'u1', Enabled: false })
    expect(ipcRendererMock.invoke).toHaveBeenCalledWith('SetAIReActScheduleEnabled', { UUID: 'u1', Enabled: false })
  })

  it('grpcPreviewAIReActScheduleTimes / grpcGetAIReActSchedule / grpcDeleteAIReActSchedule 走各自通道', async () => {
    await grpcPreviewAIReActScheduleTimes({
      Schedule: { RRule: 'RRULE:FREQ=DAILY;INTERVAL=1', Timezone: 'UTC', StartAt: 1 },
      Count: 3,
      AfterTimestamp: 0,
    })
    expect(ipcRendererMock.invoke).toHaveBeenCalledWith('PreviewAIReActScheduleTimes', {
      Schedule: { RRule: 'RRULE:FREQ=DAILY;INTERVAL=1', Timezone: 'UTC', StartAt: 1 },
      Count: 3,
      AfterTimestamp: 0,
    })

    await grpcGetAIReActSchedule({ UUID: 'u2' })
    expect(ipcRendererMock.invoke).toHaveBeenCalledWith('GetAIReActSchedule', { UUID: 'u2' })

    await grpcDeleteAIReActSchedule({ UUID: 'u3' })
    expect(ipcRendererMock.invoke).toHaveBeenCalledWith('DeleteAIReActSchedule', { UUID: 'u3' })
  })

  it('grpcQueryAIReActSchedules 透传分页与筛选条件并回传列表', async () => {
    const response = { Pagination: { Page: 1, Limit: 10 }, Data: [], Total: 0 }
    ipcRendererMock.invoke.mockResolvedValue(response)

    await expect(grpcQueryAIReActSchedules(queryReq() as never)).resolves.toBe(response)
    expect(ipcRendererMock.invoke).toHaveBeenCalledWith('QueryAIReActSchedules', queryReq())
  })

  it('grpcRunAIReActScheduleNow 走 RunAIReActScheduleNow 通道', async () => {
    await grpcRunAIReActScheduleNow({ UUID: 'u4' })
    expect(ipcRendererMock.invoke).toHaveBeenCalledWith('RunAIReActScheduleNow', { UUID: 'u4' })
  })
})

describe('AI 定时任务 grpc 封装：错误处理', () => {
  beforeEach(() => {
    resetIpcMocks()
    mockedNotify.mockClear()
  })

  it('失败时 reject 并弹 error 通知', async () => {
    ipcRendererMock.invoke.mockRejectedValue('boom')

    await expect(grpcCreateAIReActSchedule({ Schedule: {} as never })).rejects.toBe('boom')
    expect(mockedNotify).toHaveBeenCalledTimes(1)
    expect(mockedNotify).toHaveBeenCalledWith('error', expect.stringContaining('grpcCreateAIReActSchedule'))
  })

  it('hiddenError=true 时失败仅 reject，不弹通知', async () => {
    ipcRendererMock.invoke.mockRejectedValue('boom')

    await expect(grpcDeleteAIReActSchedule({ UUID: 'u' }, true)).rejects.toBe('boom')
    expect(mockedNotify).not.toHaveBeenCalled()
  })

  it('立即执行撞上排队/执行中任务时给出友好的 warning 提示', async () => {
    ipcRendererMock.invoke.mockRejectedValue('rpc error: schedule already has a queued or running execution')

    await expect(grpcRunAIReActScheduleNow({ UUID: 'u' })).rejects.toThrow(/queued or running/)
    expect(mockedNotify).toHaveBeenCalledTimes(1)
    expect(mockedNotify).toHaveBeenCalledWith('warning', '该定时任务已经有一个正在执行或排队的任务，请稍后再试')
  })

  it('立即执行的其它错误仍走 error 通知', async () => {
    ipcRendererMock.invoke.mockRejectedValue('connection refused')

    await expect(grpcRunAIReActScheduleNow({ UUID: 'u' })).rejects.toThrow('connection refused')
    expect(mockedNotify).toHaveBeenCalledWith('error', expect.stringContaining('grpcRunAIReActScheduleNow'))
  })
})

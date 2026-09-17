import { describe, expect, it, vi, beforeEach } from 'vitest'
import { sdkMock, resetIpcMocks } from '../../../ai-re-act/hooks/__test__/setupElectron'
import { yakitNotify } from '@/utils/notification'
import i18n from '@/i18n/i18n'
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

const tAgent = i18n.getFixedT(null, 'aiAgent')

vi.mock('@/utils/notification', () => ({
  yakitNotify: vi.fn(),
}))

const mockedNotify = vi.mocked(yakitNotify)
const scheduleFixture = (UUID: string) => ({
  UUID,
  Name: 'n',
  Status: 'active',
  TargetMode: 'new_session_per_run',
  Schedule: { StartAt: '1' },
  Payload: { StartParams: null, AttachedResourceInfos: [] },
  NextRunAt: '0',
  LastRunAt: '0',
  MisfireGraceSeconds: '0',
  MaxRuntimeSeconds: '0',
  CreatedAt: '0',
  UpdatedAt: '0',
  LastStartedAt: '0',
  LastFinishedAt: '0',
})

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
    const schedule = scheduleFixture('')
    sdkMock.invoke.mockResolvedValue(schedule)

    await expect(grpcCreateAIReActSchedule({ Schedule: schedule as never })).resolves.toMatchObject({
      UUID: schedule.UUID,
      CreatedAt: 0,
    })
    expect(sdkMock.invoke).toHaveBeenCalledWith('grpc', 'CreateAIReActSchedule', { Schedule: schedule })
  })

  it('grpcUpdateAIReActSchedule / grpcSetAIReActScheduleEnabled 走各自通道', async () => {
    const schedule = scheduleFixture('u1')
    sdkMock.invoke.mockResolvedValue(schedule)
    await grpcUpdateAIReActSchedule({ Schedule: schedule as never })
    expect(sdkMock.invoke).toHaveBeenCalledWith('grpc', 'UpdateAIReActSchedule', { Schedule: schedule })

    await grpcSetAIReActScheduleEnabled({ UUID: 'u1', Enabled: false })
    expect(sdkMock.invoke).toHaveBeenCalledWith('grpc', 'SetAIReActScheduleEnabled', { UUID: 'u1', Enabled: false })
  })

  it('grpcPreviewAIReActScheduleTimes / grpcGetAIReActSchedule / grpcDeleteAIReActSchedule 走各自通道', async () => {
    sdkMock.invoke.mockResolvedValueOnce({ Timestamps: ['1', '2', '3'] }).mockResolvedValue(scheduleFixture('u2'))
    await grpcPreviewAIReActScheduleTimes({
      Schedule: { RRule: 'RRULE:FREQ=DAILY;INTERVAL=1', Timezone: 'UTC', StartAt: 1 },
      Count: 3,
      AfterTimestamp: 0,
    })
    expect(sdkMock.invoke).toHaveBeenCalledWith('grpc', 'PreviewAIReActScheduleTimes', {
      Schedule: { RRule: 'RRULE:FREQ=DAILY;INTERVAL=1', Timezone: 'UTC', StartAt: 1 },
      Count: 3,
      AfterTimestamp: 0,
    })

    await grpcGetAIReActSchedule({ UUID: 'u2' })
    expect(sdkMock.invoke).toHaveBeenCalledWith('grpc', 'GetAIReActSchedule', { UUID: 'u2' })

    await grpcDeleteAIReActSchedule({ UUID: 'u3' })
    expect(sdkMock.invoke).toHaveBeenCalledWith('grpc', 'DeleteAIReActSchedule', { UUID: 'u3' })
  })

  it('grpcQueryAIReActSchedules 透传分页与筛选条件并回传列表', async () => {
    const response = { Pagination: { Page: 1, Limit: 10 }, Data: [], Total: 0 }
    sdkMock.invoke.mockResolvedValue(response)

    await expect(grpcQueryAIReActSchedules(queryReq() as never)).resolves.toMatchObject(response)
    expect(sdkMock.invoke).toHaveBeenCalledWith('grpc', 'QueryAIReActSchedules', queryReq())
  })

  it('grpcRunAIReActScheduleNow 走 RunAIReActScheduleNow 通道', async () => {
    await grpcRunAIReActScheduleNow({ UUID: 'u4' })
    expect(sdkMock.invoke).toHaveBeenCalledWith('grpc', 'RunAIReActScheduleNow', { UUID: 'u4' })
  })
})

describe('AI 定时任务 grpc 封装：错误处理', () => {
  beforeEach(() => {
    resetIpcMocks()
    mockedNotify.mockClear()
  })

  it('失败时 reject 并弹 error 通知', async () => {
    sdkMock.invoke.mockRejectedValue('boom')

    await expect(grpcCreateAIReActSchedule({ Schedule: {} as never })).rejects.toBe('boom')
    expect(mockedNotify).toHaveBeenCalledTimes(1)
    expect(mockedNotify).toHaveBeenCalledWith('error', expect.stringContaining('grpcCreateAIReActSchedule'))
  })

  it('hiddenError=true 时失败仅 reject，不弹通知', async () => {
    sdkMock.invoke.mockRejectedValue('boom')

    await expect(grpcDeleteAIReActSchedule({ UUID: 'u' }, true)).rejects.toBe('boom')
    expect(mockedNotify).not.toHaveBeenCalled()
  })

  it('立即执行撞上排队/执行中任务时给出友好的 warning 提示', async () => {
    sdkMock.invoke.mockRejectedValue(new Error('rpc error: schedule already has a queued or running execution'))

    await expect(grpcRunAIReActScheduleNow({ UUID: 'u' })).rejects.toThrow(/queued or running/)
    expect(mockedNotify).toHaveBeenCalledTimes(1)
    // 测试环境 i18n 资源不加载，t() 返回 key 本身；与实现使用同一翻译源断言
    expect(mockedNotify).toHaveBeenCalledWith('warning', tAgent('AIScheduledTasks.runNowQueued'))
  })

  it('立即执行的其它错误仍走 error 通知', async () => {
    sdkMock.invoke.mockRejectedValue(new Error('connection refused'))

    await expect(grpcRunAIReActScheduleNow({ UUID: 'u' })).rejects.toThrow('connection refused')
    expect(mockedNotify).toHaveBeenCalledWith('error', expect.stringContaining('grpcRunAIReActScheduleNow'))
  })
})

import { describe, expect, it, vi, beforeEach } from 'vitest'
import { ipcRendererMock, resetIpcMocks } from '../../../ai-re-act/hooks/__test__/setupElectron'
import { yakitNotify } from '@/utils/notification'
import i18n from '@/i18n/i18n'
import type { AIReActSchedule } from '../../../ai-re-act/hooks/grpcApi'
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

const scheduleFixture = (): AIReActSchedule => ({
  UUID: 'u1',
  Name: 'n',
  Status: 'active',
  TargetMode: 'new_session_per_run',
  Payload: { Prompt: 'run task', StartParams: { RuntimeContextSizeLimit: 0, AICallAutoRetry: 7 } },
  Schedule: { RRule: 'RRULE:FREQ=DAILY;INTERVAL=1', Timezone: 'UTC', StartAt: 1800000000 },
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
    const schedule = scheduleFixture()
    ipcRendererMock.invoke.mockResolvedValue(schedule)

    await expect(grpcCreateAIReActSchedule({ Schedule: schedule })).resolves.toEqual(schedule)
    expect(ipcRendererMock.invoke).toHaveBeenCalledWith('CreateAIReActSchedule', { Schedule: schedule })
  })

  it('grpcUpdateAIReActSchedule / grpcSetAIReActScheduleEnabled 走各自通道', async () => {
    const schedule = scheduleFixture()
    ipcRendererMock.invoke.mockResolvedValue(schedule)
    await grpcUpdateAIReActSchedule({ Schedule: schedule })
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

    ipcRendererMock.invoke.mockResolvedValueOnce(scheduleFixture())
    await grpcGetAIReActSchedule({ UUID: 'u2' })
    expect(ipcRendererMock.invoke).toHaveBeenCalledWith('GetAIReActSchedule', { UUID: 'u2' })

    await grpcDeleteAIReActSchedule({ UUID: 'u3' })
    expect(ipcRendererMock.invoke).toHaveBeenCalledWith('DeleteAIReActSchedule', { UUID: 'u3' })
  })

  it('grpcQueryAIReActSchedules 透传分页与筛选条件并回传列表', async () => {
    const response = { Pagination: { Page: 1, Limit: 10 }, Data: [], Total: 0 }
    ipcRendererMock.invoke.mockResolvedValue(response)

    await expect(grpcQueryAIReActSchedules(queryReq() as never)).resolves.toEqual(response)
    expect(ipcRendererMock.invoke).toHaveBeenCalledWith('QueryAIReActSchedules', queryReq())
  })

  it('grpcRunAIReActScheduleNow 走 RunAIReActScheduleNow 通道', async () => {
    await grpcRunAIReActScheduleNow({ UUID: 'u4' })
    expect(ipcRendererMock.invoke).toHaveBeenCalledWith('RunAIReActScheduleNow', { UUID: 'u4' })
  })

  it.each([
    { name: '创建', invoke: () => grpcCreateAIReActSchedule({ Schedule: scheduleFixture() }) },
    { name: '更新', invoke: () => grpcUpdateAIReActSchedule({ Schedule: scheduleFixture() }) },
    { name: '详情', invoke: () => grpcGetAIReActSchedule({ UUID: 'u1' }) },
    { name: '启停', invoke: () => grpcSetAIReActScheduleEnabled({ UUID: 'u1', Enabled: false }) },
  ])('$name返回后先将字符串阈值转换为数字，不改动原始响应', async ({ invoke }) => {
    const schedule = scheduleFixture()
    const response = {
      ...schedule,
      Payload: {
        ...schedule.Payload,
        StartParams: { ...schedule.Payload.StartParams, RuntimeContextSizeLimit: '307200' },
      },
    }
    ipcRendererMock.invoke.mockResolvedValue(response)

    await expect(invoke()).resolves.toEqual({
      ...schedule,
      Payload: {
        ...schedule.Payload,
        StartParams: { ...schedule.Payload.StartParams, RuntimeContextSizeLimit: 307200 },
      },
    })
    expect(response.Payload.StartParams.RuntimeContextSizeLimit).toBe('307200')
  })

  it('列表逐项转换阈值，转换失败使用默认值，并保留分页及其他字段', async () => {
    const limits = ['307200', 'invalid', undefined, 4096]
    const schedule = scheduleFixture()
    const response = {
      Pagination: { Page: 1, Limit: 10 },
      Total: limits.length,
      Data: limits.map((limit, index) => ({
        ...schedule,
        UUID: `u${index}`,
        Payload: {
          ...schedule.Payload,
          StartParams: { ...schedule.Payload.StartParams, RuntimeContextSizeLimit: limit },
        },
      })),
    }
    ipcRendererMock.invoke.mockResolvedValue(response)

    const result = await grpcQueryAIReActSchedules(queryReq() as never)
    expect(result).toEqual({
      ...response,
      Data: response.Data.map((item, index) => ({
        ...item,
        Payload: {
          ...item.Payload,
          StartParams: { ...item.Payload.StartParams, RuntimeContextSizeLimit: [307200, 0, 0, 4096][index] },
        },
      })),
    })
    expect(response.Data.map((item) => item.Payload.StartParams.RuntimeContextSizeLimit)).toEqual(limits)
  })

  it('未返回启动参数时保持缺省，保留编辑表单使用全局设置的逻辑', async () => {
    const response = { ...scheduleFixture(), Payload: { Prompt: 'run task' } }
    ipcRendererMock.invoke.mockResolvedValue(response)
    await expect(grpcGetAIReActSchedule({ UUID: response.UUID })).resolves.toEqual(response)
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
    // 测试环境 i18n 资源不加载，t() 返回 key 本身；与实现使用同一翻译源断言
    expect(mockedNotify).toHaveBeenCalledWith('warning', tAgent('AIScheduledTasks.runNowQueued'))
  })

  it('立即执行的其它错误仍走 error 通知', async () => {
    ipcRendererMock.invoke.mockRejectedValue('connection refused')

    await expect(grpcRunAIReActScheduleNow({ UUID: 'u' })).rejects.toThrow('connection refused')
    expect(mockedNotify).toHaveBeenCalledWith('error', expect.stringContaining('grpcRunAIReActScheduleNow'))
  })
})

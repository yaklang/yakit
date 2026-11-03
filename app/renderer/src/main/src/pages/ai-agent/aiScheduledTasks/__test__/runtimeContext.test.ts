import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ipcRendererMock } from '../../../ai-re-act/hooks/__test__/setupElectron'

vi.mock('@/utils/notification', () => ({ yakitNotify: vi.fn() }))
vi.mock('@/i18n/i18n', () => ({ default: { getFixedT: () => (key: string) => key } }))

import { grpcGetAIReActSchedule, grpcQueryAIReActSchedules, grpcUpdateAIReActSchedule } from '../utils'

describe('schedule context response boundary', () => {
  beforeEach(() => {
    ipcRendererMock.invoke.mockReset()
  })

  it('normalizes a saved int64 value as bytes without modifying the response or schedule metadata', async () => {
    const original = {
      UUID: 'schedule-1',
      Name: 'Existing task',
      Schedule: { RRule: 'RRULE:FREQ=DAILY', Timezone: 'Asia/Shanghai', StartAt: 1800000000 },
      Payload: {
        Prompt: 'analyse',
        AttachedResourceInfos: [{ Type: 'aiforge', Key: 'name', Value: 'employee-forge' }],
        StartParams: { RuntimeContextSizeLimit: '307200', TimelineContentSizeLimit: '61440', AICallAutoRetry: 7 },
      },
    }
    ipcRendererMock.invoke.mockResolvedValue(original)
    const result = await grpcGetAIReActSchedule({ UUID: original.UUID }, true)
    expect(result.Payload.StartParams).toEqual({ RuntimeContextSizeLimit: 307200, AICallAutoRetry: 7 })
    expect(result.Schedule).toEqual(original.Schedule)
    expect(result.Payload.AttachedResourceInfos).toEqual(original.Payload.AttachedResourceInfos)
    expect(original.Payload.StartParams.RuntimeContextSizeLimit).toBe('307200')
    expect(original.Payload.StartParams.TimelineContentSizeLimit).toBe('61440')
    await grpcUpdateAIReActSchedule({ Schedule: result }, true)
    expect(ipcRendererMock.invoke).toHaveBeenLastCalledWith('UpdateAIReActSchedule', { Schedule: result })
  })

  it('normalizes every returned page entry and preserves unrelated query metadata', async () => {
    ipcRendererMock.invoke.mockResolvedValue({
      Data: [
        { UUID: 'legacy', Payload: { StartParams: { TimelineContentSizeLimit: 61440 } } },
        { UUID: 'current', Payload: { StartParams: { RuntimeContextSizeLimit: '4096' } } },
        { UUID: 'invalid', Payload: { StartParams: { RuntimeContextSizeLimit: '9223372036854775807' } } },
      ],
      Total: 3,
      Pagination: { Page: 2, Limit: 3 },
    })
    const result = await grpcQueryAIReActSchedules({} as never, true)
    expect(result.Data.map((item) => item.Payload.StartParams.RuntimeContextSizeLimit)).toEqual([0, 4096, 0])
    expect(result.Total).toBe(3)
    expect(result.Pagination.Page).toBe(2)
    expect(result.Data[0].Payload.StartParams).not.toHaveProperty('TimelineContentSizeLimit')
  })

  it('keeps an engine error as a rejection rather than presenting a default threshold as a successful result', async () => {
    const error = new Error('engine unavailable')
    ipcRendererMock.invoke.mockRejectedValue(error)
    await expect(grpcGetAIReActSchedule({ UUID: 'missing' }, true)).rejects.toBe(error)
  })
})

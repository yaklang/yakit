import { describe, expect, it, vi, beforeEach } from 'vitest'
import { AISessionDeleteCancelledError, handAIHistoryChatRemove, type HandAIHistoryChatRemoveParams } from '../utils'
import { grpcQueryAIReActSchedules } from '../../aiScheduledTasks/utils'
import { grpcDeleteAISession } from '../../grpc'
import { globalSessionEngine } from '@/pages/ai-re-act/hooks/ChatMultiSessionController'
import { handleClearAIImage } from '../../components/aiMilkdownInput/aiCustomFile/hooks/useDeleteAIImageByNode'
import { YakitModalConfirm } from '@/components/yakitUI/YakitModal/YakitModalConfirm'

vi.mock('../../grpc', () => ({
  grpcDeleteAISession: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('../../aiScheduledTasks/utils', () => ({
  grpcQueryAIReActSchedules: vi.fn(),
}))
vi.mock('@/pages/ai-re-act/hooks/ChatMultiSessionController', () => ({
  globalSessionEngine: { deleteSessions: vi.fn().mockResolvedValue(undefined) },
}))
vi.mock('../../components/aiMilkdownInput/aiCustomFile/hooks/useDeleteAIImageByNode', () => ({
  handleClearAIImage: vi.fn(),
}))

/** YakitModalConfirm mock：记录本次弹窗 props，供用例模拟用户点击确认/取消 */
let lastModalProps: {
  onOk: () => void
  onCancel: () => void
}
vi.mock('@/components/yakitUI/YakitModal/YakitModalConfirm', () => ({
  YakitModalConfirm: vi.fn((props: { onOk: () => void; onCancel: () => void }) => {
    lastModalProps = props
    return { destroy: vi.fn() }
  }),
}))

const makeParams = (extra: Partial<HandAIHistoryChatRemoveParams> = {}): HandAIHistoryChatRemoveParams => ({
  grpcDeleteAISessionParams: { UUIDs: ['s1'] } as never,
  handleClearAIImageParams: {} as never,
  deleteSessionsParams: { sessionIds: ['s1'], source: [] } as never,
  ...extra,
})

const mockedQuery = vi.mocked(grpcQueryAIReActSchedules)
const mockedDeleteGrpc = vi.mocked(grpcDeleteAISession)
const mockedDeleteSessions = vi.mocked(globalSessionEngine.deleteSessions)
const mockedClearImage = vi.mocked(handleClearAIImage)

describe('handAIHistoryChatRemove 定时任务预检', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedDeleteGrpc.mockResolvedValue(undefined)
    mockedDeleteSessions.mockResolvedValue(undefined)
    mockedQuery.mockResolvedValue({ Pagination: { Page: 1, Limit: 3 }, Data: [], Total: 0 } as never)
  })

  it('无绑定的活跃 continue_session 任务时不弹确认，直接完成三步删除', async () => {
    await handAIHistoryChatRemove(makeParams())

    expect(YakitModalConfirm).not.toHaveBeenCalled()
    expect(mockedDeleteSessions).toHaveBeenCalledTimes(1)
    expect(mockedDeleteGrpc).toHaveBeenCalledTimes(1)
    expect(mockedClearImage).toHaveBeenCalledTimes(1)
  })

  it('预检查询按活跃 continue_session 模式过滤，并带上会话 ID 列表', async () => {
    await handAIHistoryChatRemove(makeParams())

    expect(mockedQuery).toHaveBeenCalledWith(
      {
        Pagination: { Page: 1, Limit: 3, OrderBy: 'created_at', Order: 'desc' },
        Filter: {
          Status: ['active'],
          TargetModes: ['continue_session'],
          TargetSessionIDs: ['s1'],
        },
      },
      true,
    )
  })

  it('清空场景（会话列表为空）查询时不带 TargetSessionIDs', async () => {
    await handAIHistoryChatRemove(makeParams({ deleteSessionsParams: { sessionIds: [], source: [] } as never }))

    const filter = mockedQuery.mock.calls[0][0].Filter as Record<string, unknown>
    expect(filter.TargetSessionIDs).toBeUndefined()
  })

  it('scheduleSessionIds 优先于 deleteSessionsParams.sessionIds 作为预检范围', async () => {
    await handAIHistoryChatRemove(
      makeParams({
        deleteSessionsParams: { sessionIds: ['route-s1'], source: [] } as never,
        scheduleSessionIds: ['s1', 's2'],
      }),
    )

    const filter = mockedQuery.mock.calls[0][0].Filter as Record<string, unknown>
    expect(filter.TargetSessionIDs).toEqual(['s1', 's2'])
  })

  it('存在绑定任务且用户确认后继续删除', async () => {
    mockedQuery.mockResolvedValue({
      Pagination: { Page: 1, Limit: 3 },
      Total: 1,
      Data: [{ UUID: 'sch-1', Name: '每日巡检', Status: 'active', TargetMode: 'continue_session' }],
    } as never)

    const pending = handAIHistoryChatRemove(makeParams())
    // 等待确认弹窗出现后模拟用户点击确认
    await vi.waitFor(() => expect(YakitModalConfirm).toHaveBeenCalled())
    lastModalProps.onOk()
    await expect(pending).resolves.toBeUndefined()

    expect(mockedDeleteSessions).toHaveBeenCalledTimes(1)
    expect(mockedDeleteGrpc).toHaveBeenCalledTimes(1)
  })

  it('存在绑定任务且用户取消时抛 AISessionDeleteCancelledError，跳过全部删除步骤', async () => {
    mockedQuery.mockResolvedValue({
      Pagination: { Page: 1, Limit: 3 },
      Total: 2,
      Data: [
        { UUID: 'sch-1', Name: '每日巡检', Status: 'active', TargetMode: 'continue_session' },
        { UUID: 'sch-2', Name: '周报生成', Status: 'active', TargetMode: 'continue_session' },
      ],
    } as never)

    const pending = handAIHistoryChatRemove(makeParams())
    await vi.waitFor(() => expect(YakitModalConfirm).toHaveBeenCalled())
    lastModalProps.onCancel()
    await expect(pending).rejects.toBeInstanceOf(AISessionDeleteCancelledError)

    expect(mockedDeleteSessions).not.toHaveBeenCalled()
    expect(mockedDeleteGrpc).not.toHaveBeenCalled()
    expect(mockedClearImage).not.toHaveBeenCalled()
  })

  it('Data 为空但 Total 大于 0 时仍弹确认（Total 缺省时回退用 Data 长度）', async () => {
    mockedQuery.mockResolvedValue({
      Pagination: { Page: 1, Limit: 3 },
      Total: 5,
      Data: [{ UUID: 'sch-1', Name: '每日巡检', Status: 'active', TargetMode: 'continue_session' }],
    } as never)

    const pending = handAIHistoryChatRemove(makeParams())
    await vi.waitFor(() => expect(YakitModalConfirm).toHaveBeenCalled())
    lastModalProps.onOk()
    await expect(pending).resolves.toBeUndefined()
  })
})

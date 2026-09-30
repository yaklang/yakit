import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiGetFlowDisposalLogs } from '@/components/HTTPFlowTable/FlowDisposalLog/utils'
import { apiGetDisposalLogs } from '@/pages/risks/YakitRiskTable/RiskDisposalLog/utils'

const mocks = vi.hoisted(() => ({
  netWorkApi: vi.fn(),
}))

vi.mock('@/services/fetch', () => ({ NetWorkApi: (...args: unknown[]) => mocks.netWorkApi(...args) }))
vi.mock('@/utils/notification', () => ({ yakitNotify: vi.fn() }))
vi.mock('@/services/electronBridge', () => ({ yakitUpload: { splitUpload: vi.fn() } }))
vi.mock('@/i18n/i18n', () => ({ default: { getFixedT: () => (key: string) => key } }))

describe('处置日志分页请求', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.netWorkApi.mockResolvedValue({ data: [], pagemeta: { total: 0 } })
  })

  it('流量日志请求真实页码，并按创建时间倒序', async () => {
    await apiGetFlowDisposalLogs({ hash: 'flow-hash', page: 1, limit: 20 })
    await apiGetFlowDisposalLogs({ hash: 'flow-hash', page: 2, limit: 20 })

    expect(mocks.netWorkApi.mock.calls.map((call) => call[0].data)).toEqual([
      {
        hash: 'flow-hash',
        targetType: 'httpflow',
        page: 1,
        limit: 20,
        order_by: 'created_at',
        order: 'desc',
      },
      {
        hash: 'flow-hash',
        targetType: 'httpflow',
        page: 2,
        limit: 20,
        order_by: 'created_at',
        order: 'desc',
      },
    ])
  })

  it('漏洞日志请求真实页码，并按创建时间倒序', async () => {
    await apiGetDisposalLogs({ risk_hash: 'risk-hash', page: 1, limit: 20 })
    await apiGetDisposalLogs({ risk_hash: 'risk-hash', page: 2, limit: 20 })

    expect(mocks.netWorkApi.mock.calls.map((call) => call[0].data)).toEqual([
      {
        hash: 'risk-hash',
        targetType: 'risk',
        page: 1,
        limit: 20,
        order_by: 'created_at',
        order: 'desc',
      },
      {
        hash: 'risk-hash',
        targetType: 'risk',
        page: 2,
        limit: 20,
        order_by: 'created_at',
        order: 'desc',
      },
    ])
  })
})

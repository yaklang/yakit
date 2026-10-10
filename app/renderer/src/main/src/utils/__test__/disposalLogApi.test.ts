import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiGetFlowDisposalLogs } from '@/components/HTTPFlowTable/FlowDisposalLog/utils'
import { apiGetDisposalLogs } from '@/pages/risks/YakitRiskTable/RiskDisposalLog/utils'
import { mergeDisposalLogs } from '../disposalLog'

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

  it.each([
    ['流量', (page: number) => apiGetFlowDisposalLogs({ hash: 'flow-hash', page, limit: 20 })],
    ['漏洞', (page: number) => apiGetDisposalLogs({ risk_hash: 'risk-hash', page, limit: 20 })],
  ] as const)('%s 跨页加载后保留原评论的文字、图片和附件引用', async (_, getLogs) => {
    const description = JSON.stringify([
      { type: 'text', value: '原评论' },
      { type: 'image', value: { url: 'https://files.test/image.png', width: 10, height: 10 } },
      { type: 'file', value: { url: 'https://files.test/report.pdf', name: 'report.pdf', size: 100 } },
    ])
    mocks.netWorkApi.mockResolvedValueOnce({
      data: [{ id: 30, recordType: 'comment', content: '回复', parentId: 1, parentUserName: 'author' }],
    })
    mocks.netWorkApi.mockResolvedValueOnce({
      data: [{ id: 1, recordType: 'comment', content: description, userName: 'author' }],
    })

    const firstPage = await getLogs(1)
    const secondPage = await getLogs(2)
    const result = mergeDisposalLogs(firstPage.data, secondPage.data)

    expect(result[0].parentComment).toEqual({ id: 1, userName: 'author', description })
    expect(firstPage.data[0].parentComment?.description).toBe('')
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

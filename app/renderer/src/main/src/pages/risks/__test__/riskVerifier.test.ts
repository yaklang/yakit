import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NetWorkApi } from '@/services/fetch'
import { apiGetRiskVerifierUid } from '../riskVerifier'

vi.mock('@/services/fetch', () => ({ NetWorkApi: vi.fn() }))

beforeEach(() => vi.clearAllMocks())

describe('风险验证人回读', () => {
  it.each(['hash', 'risk_hash'])('按当前风险查询并读取 %s 匹配记录的验证人', async (field) => {
    vi.mocked(NetWorkApi).mockImplementation(async ({ data }) => {
      for (const key of ['page', 'limit', 'order_by', 'order']) {
        if (!data?.[key]) throw new Error(`${key} in body is required`)
      }
      return { data: [{ [field]: 'risk-1', verifierUid: 'user-1' }] }
    })

    expect(await apiGetRiskVerifierUid('risk-1')).toBe('user-1')
    expect(NetWorkApi).toHaveBeenCalledWith({
      method: 'post',
      url: 'risk',
      data: { hash: ['risk-1'], page: 1, limit: 1, order_by: 'id', order: 'desc' },
    })
  })

  it('不会将其他风险的验证人填入当前风险', async () => {
    vi.mocked(NetWorkApi).mockResolvedValue({ data: [{ hash: 'other', verifierUid: 'other-user' }] })
    expect(await apiGetRiskVerifierUid('risk-1')).toBeUndefined()
  })

  it('未上传的风险不构造验证人', async () => {
    vi.mocked(NetWorkApi).mockResolvedValue({ data: [] })
    expect(await apiGetRiskVerifierUid('local-risk')).toBeUndefined()
  })

  it('查询失败保留失败状态，由表单提示而不是当作没有验证人', async () => {
    const error = new Error('offline')
    vi.mocked(NetWorkApi).mockRejectedValue(error)
    await expect(apiGetRiskVerifierUid('risk-1')).rejects.toBe(error)
  })
})

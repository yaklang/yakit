import '../../ai-re-act/hooks/__test__/setupElectron'
import { describe, expect, it, vi } from 'vitest'
import { ipcRendererMock } from '../../ai-re-act/hooks/__test__/setupElectron'
import { grpcQueryAISession } from '../grpc'
import type { QueryAISessionResponse } from '../type/aiChat'

vi.mock('@/utils/notification', () => ({ yakitNotify: vi.fn() }))
vi.mock('../../ai-re-act/hooks/utils', () => ({ genBaseAIChatData: vi.fn(), isToolExecStream: vi.fn() }))

describe('会话配置接收边界', () => {
  it.each([0, 300])('查询后将后端字节值转为前端 KB，且不修改响应原对象：%s', async (limit) => {
    const response = {
      Data: [
        { SessionID: 'session', StartParams: { RuntimeContextSizeLimit: limit * 1024, AICallTokenLimit: 40 * 1024 } },
      ],
      Total: 1,
    } as QueryAISessionResponse
    ipcRendererMock.invoke.mockResolvedValueOnce(response)

    const result = await grpcQueryAISession({
      Pagination: { Page: 1, Limit: 10, OrderBy: 'created_at', Order: 'desc' },
    })

    expect(result.Data[0].StartParams).toEqual({ RuntimeContextSizeLimit: limit, AICallTokenLimit: 40 })
    expect(response.Data[0].StartParams?.RuntimeContextSizeLimit).toBe(limit * 1024)
    expect(result.Data[0]).not.toBe(response.Data[0])
  })

  it('历史缺省字段保持缺省，不引入默认阈值', async () => {
    ipcRendererMock.invoke.mockResolvedValueOnce({ Data: [{ SessionID: 'session', StartParams: {} }], Total: 1 })

    const result = await grpcQueryAISession({
      Pagination: { Page: 1, Limit: 10, OrderBy: 'created_at', Order: 'desc' },
    })

    expect(result.Data[0].StartParams).toEqual({})
  })
})

import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { grpcQueryHTTPFlows } from '../../../grpc'
import { apiRiskFieldGroup, type RiskFieldGroupResponse } from '@/pages/risks/YakitRiskTable/utils'
import type { AIRightPanelRiskCounts } from '@/pages/ai-re-act/aiRightPanel/type'
import { useWelcomePanelStats } from '../useWelcomePanelStats'

vi.mock('../../../grpc', () => ({ grpcQueryHTTPFlows: vi.fn() }))
vi.mock('@/pages/risks/YakitRiskTable/utils', () => ({ apiRiskFieldGroup: vi.fn() }))

const trafficResponse = (Total: number): Awaited<ReturnType<typeof grpcQueryHTTPFlows>> => ({
  Total,
  Data: [],
  Pagination: { Page: 1, Limit: 1, Order: 'desc', OrderBy: 'id' },
})

const riskResponse = (groups: Array<{ Name: string; Total: number }>): RiskFieldGroupResponse => ({
  RiskIPGroup: [],
  RiskTypeGroup: [],
  RiskLevelGroup: groups.map((group) => ({ ...group, Verbose: '', Delta: 0 })),
})

const deferred = <T>() => {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

describe('useWelcomePanelStats', () => {
  beforeEach(() => {
    vi.mocked(grpcQueryHTTPFlows).mockReset().mockResolvedValue(trafficResponse(10))
    vi.mocked(apiRiskFieldGroup)
      .mockReset()
      .mockResolvedValue(riskResponse([{ Name: 'high', Total: 2 }]))
  })

  it.each<[string, keyof AIRightPanelRiskCounts]>([
    ['fatal', 'serious'],
    ['critical', 'serious'],
    ['panic', 'serious'],
    ['high', 'high'],
    ['middle', 'medium'],
    ['warn', 'medium'],
    ['warning', 'medium'],
    ['medium', 'medium'],
    ['low', 'low'],
    ['info', 'info'],
    ['other', 'info'],
    ['unknown-level', 'info'],
  ])('漏洞等级 %s 归入 %s，重复分组累加', async (Name, field) => {
    vi.mocked(apiRiskFieldGroup).mockResolvedValueOnce(
      riskResponse([
        { Name, Total: 2 },
        { Name, Total: 3 },
      ]),
    )

    const { result } = renderHook(() => useWelcomePanelStats(true))

    await waitFor(() => expect(result.current.riskCounts).toEqual({ [field]: 5 }))
    expect(result.current.riskTotal).toBe(5)
  })

  it('隐藏期间忽略未完成请求的返回，再次显示时读取新统计', async () => {
    const traffic = deferred<ReturnType<typeof trafficResponse>>()
    const risk = deferred<RiskFieldGroupResponse>()
    vi.mocked(grpcQueryHTTPFlows).mockReturnValueOnce(traffic.promise)
    vi.mocked(apiRiskFieldGroup).mockReturnValueOnce(risk.promise)
    const { result, rerender } = renderHook(({ visible }) => useWelcomePanelStats(visible), {
      initialProps: { visible: true },
    })

    rerender({ visible: false })
    await act(async () => {
      traffic.resolve(trafficResponse(99))
      risk.resolve(riskResponse([{ Name: 'critical', Total: 9 }]))
    })
    expect(result.current).toEqual({ trafficTotal: undefined, riskTotal: 0, riskCounts: undefined })
    expect(grpcQueryHTTPFlows).toHaveBeenCalledTimes(1)
    expect(apiRiskFieldGroup).toHaveBeenCalledTimes(1)

    rerender({ visible: true })
    await waitFor(() => expect(result.current).toEqual({ trafficTotal: 10, riskTotal: 2, riskCounts: { high: 2 } }))
    expect(grpcQueryHTTPFlows).toHaveBeenCalledTimes(2)
    expect(apiRiskFieldGroup).toHaveBeenCalledTimes(2)
  })

  it('快速隐藏再显示时，较晚返回的旧请求不能覆盖新统计', async () => {
    const traffic = deferred<ReturnType<typeof trafficResponse>>()
    const risk = deferred<RiskFieldGroupResponse>()
    vi.mocked(grpcQueryHTTPFlows).mockReturnValueOnce(traffic.promise)
    vi.mocked(apiRiskFieldGroup).mockReturnValueOnce(risk.promise)
    const { result, rerender } = renderHook(({ visible }) => useWelcomePanelStats(visible), {
      initialProps: { visible: true },
    })

    rerender({ visible: false })
    rerender({ visible: true })
    await waitFor(() => expect(result.current).toEqual({ trafficTotal: 10, riskTotal: 2, riskCounts: { high: 2 } }))
    await act(async () => {
      traffic.resolve(trafficResponse(99))
      risk.resolve(riskResponse([{ Name: 'critical', Total: 9 }]))
    })
    expect(result.current).toEqual({ trafficTotal: 10, riskTotal: 2, riskCounts: { high: 2 } })
  })

  it.each(['traffic', 'risk'] as const)('%s 请求未完成时，另一项统计仍可独立更新', async (pendingApi) => {
    const traffic = deferred<ReturnType<typeof trafficResponse>>()
    const risk = deferred<RiskFieldGroupResponse>()
    if (pendingApi === 'traffic') vi.mocked(grpcQueryHTTPFlows).mockReturnValueOnce(traffic.promise)
    else vi.mocked(apiRiskFieldGroup).mockReturnValueOnce(risk.promise)

    const { result } = renderHook(() => useWelcomePanelStats(true))
    await waitFor(() =>
      expect(result.current).toEqual(
        pendingApi === 'traffic'
          ? { trafficTotal: undefined, riskTotal: 2, riskCounts: { high: 2 } }
          : { trafficTotal: 10, riskTotal: 0, riskCounts: undefined },
      ),
    )
    await act(async () => {
      if (pendingApi === 'traffic') traffic.resolve(trafficResponse(20))
      else risk.resolve(riskResponse([{ Name: 'low', Total: 4 }]))
    })
    expect(result.current).toEqual(
      pendingApi === 'traffic'
        ? { trafficTotal: 20, riskTotal: 2, riskCounts: { high: 2 } }
        : { trafficTotal: 10, riskTotal: 4, riskCounts: { low: 4 } },
    )
  })

  it.each(['traffic', 'risk', 'both'] as const)('刷新失败保留已有统计，下次可见时可恢复（%s）', async (failedApi) => {
    const { result, rerender } = renderHook(({ visible }) => useWelcomePanelStats(visible), {
      initialProps: { visible: true },
    })
    await waitFor(() => expect(result.current).toEqual({ trafficTotal: 10, riskTotal: 2, riskCounts: { high: 2 } }))
    rerender({ visible: false })
    if (failedApi !== 'risk') vi.mocked(grpcQueryHTTPFlows).mockRejectedValueOnce(new Error('traffic failed'))
    else vi.mocked(grpcQueryHTTPFlows).mockResolvedValueOnce(trafficResponse(20))
    if (failedApi !== 'traffic') vi.mocked(apiRiskFieldGroup).mockRejectedValueOnce(new Error('risk failed'))
    else vi.mocked(apiRiskFieldGroup).mockResolvedValueOnce(riskResponse([{ Name: 'low', Total: 4 }]))

    await act(async () => rerender({ visible: true }))
    expect(result.current).toEqual({
      trafficTotal: failedApi === 'risk' ? 20 : 10,
      riskTotal: failedApi === 'traffic' ? 4 : 2,
      riskCounts: failedApi === 'traffic' ? { low: 4 } : { high: 2 },
    })

    rerender({ visible: false })
    vi.mocked(grpcQueryHTTPFlows).mockResolvedValueOnce(trafficResponse(30))
    vi.mocked(apiRiskFieldGroup).mockResolvedValueOnce(riskResponse([{ Name: 'critical', Total: 6 }]))
    rerender({ visible: true })
    await waitFor(() => expect(result.current).toEqual({ trafficTotal: 30, riskTotal: 6, riskCounts: { serious: 6 } }))
    expect(grpcQueryHTTPFlows).toHaveBeenCalledTimes(3)
    expect(apiRiskFieldGroup).toHaveBeenCalledTimes(3)
  })

  it('刷新返回空数据时清除旧计数', async () => {
    const { result, rerender } = renderHook(({ visible }) => useWelcomePanelStats(visible), {
      initialProps: { visible: true },
    })
    await waitFor(() => expect(result.current).toEqual({ trafficTotal: 10, riskTotal: 2, riskCounts: { high: 2 } }))

    rerender({ visible: false })
    vi.mocked(grpcQueryHTTPFlows).mockResolvedValueOnce(trafficResponse(0))
    vi.mocked(apiRiskFieldGroup).mockResolvedValueOnce(riskResponse([]))
    rerender({ visible: true })

    await waitFor(() => expect(result.current).toEqual({ trafficTotal: 0, riskTotal: 0, riskCounts: {} }))
  })
})

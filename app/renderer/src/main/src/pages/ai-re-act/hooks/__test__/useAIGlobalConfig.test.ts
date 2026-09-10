import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AIModelPolicyEnum, defaultAIGlobalConfig } from '@/pages/ai-agent/defaultConstant'
import { grpcGetAIGlobalConfig, grpcSetAIGlobalConfig } from '@/pages/ai-agent/aiModelList/utils'
import { useAIGlobalConfigStore } from '@/store/aiGlobalConfig'
import useAIGlobalConfig from '../useAIGlobalConfig'

vi.mock('@/pages/ai-agent/aiModelList/utils', () => ({
  grpcGetAIGlobalConfig: vi.fn(),
  grpcSetAIGlobalConfig: vi.fn(),
}))

const getMock = vi.mocked(grpcGetAIGlobalConfig)
const setMock = vi.mocked(grpcSetAIGlobalConfig)

describe('useAIGlobalConfig', () => {
  beforeEach(() => {
    getMock.mockReset()
    setMock.mockReset()
    getMock.mockResolvedValue({ ...defaultAIGlobalConfig })
    setMock.mockResolvedValue(null)
    useAIGlobalConfigStore.setState({
      aiGlobalConfig: { ...defaultAIGlobalConfig, RoutingPolicy: AIModelPolicyEnum.PolicyAuto, DisableFallback: false },
      isInit: false,
      queryLoading: false,
    })
  })

  it('连续改调用策略和降级开关时，后一次写入会带上前一次改动并串行请求', async () => {
    let releaseFirst: (value: null) => void = () => undefined
    const firstWrite = new Promise<null>((resolve) => {
      releaseFirst = resolve
    })
    setMock.mockImplementationOnce(() => firstWrite).mockResolvedValue(null)

    const { result } = renderHook(() => useAIGlobalConfig())
    await act(async () => {
      void result.current[1].setAIGlobalConfig({ RoutingPolicy: AIModelPolicyEnum.PolicyPerformance })
      void result.current[1].setAIGlobalConfig({ DisableFallback: true })
      await Promise.resolve()
    })

    await waitFor(() => {
      expect(setMock).toHaveBeenCalledTimes(1)
    })
    expect(setMock.mock.calls[0][0]).toMatchObject({
      RoutingPolicy: AIModelPolicyEnum.PolicyPerformance,
      DisableFallback: false,
    })

    await act(async () => {
      releaseFirst(null)
      await firstWrite
    })
    await waitFor(() => {
      expect(setMock).toHaveBeenCalledTimes(2)
    })
    expect(setMock.mock.calls[1][0]).toMatchObject({
      RoutingPolicy: AIModelPolicyEnum.PolicyPerformance,
      DisableFallback: true,
    })
  })
})

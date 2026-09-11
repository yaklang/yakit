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

  it('两个实例先后保存时，后一次会带上前一次的改动', async () => {
    const first = renderHook(() => useAIGlobalConfig())
    const second = renderHook(() => useAIGlobalConfig())
    await act(async () => {
      first.result.current[1].setConfigStore({
        ...defaultAIGlobalConfig,
        RoutingPolicy: AIModelPolicyEnum.PolicyAuto,
        DisableFallback: false,
      })
      second.result.current[1].setConfigStore({
        ...defaultAIGlobalConfig,
        RoutingPolicy: AIModelPolicyEnum.PolicyAuto,
        DisableFallback: false,
      })
      void first.result.current[1].setAIGlobalConfig({ RoutingPolicy: AIModelPolicyEnum.PolicyPerformance })
      void second.result.current[1].setAIGlobalConfig({ DisableFallback: true })
    })

    await waitFor(() => {
      expect(setMock).toHaveBeenCalledTimes(2)
    })
    expect(setMock.mock.calls[1][0]).toMatchObject({
      RoutingPolicy: AIModelPolicyEnum.PolicyPerformance,
      DisableFallback: true,
    })
  })

  it('保存失败会回拉配置且后续保存仍能继续', async () => {
    setMock.mockRejectedValueOnce(new Error('save-fail')).mockResolvedValue(null)

    const { result } = renderHook(() => useAIGlobalConfig())
    await act(async () => {
      await expect(
        result.current[1].setAIGlobalConfig({ RoutingPolicy: AIModelPolicyEnum.PolicyPerformance }),
      ).rejects.toThrow('save-fail')
    })
    await waitFor(() => {
      expect(getMock).toHaveBeenCalled()
    })

    await act(async () => {
      await result.current[1].setAIGlobalConfig({ DisableFallback: true })
    })
    expect(setMock).toHaveBeenCalledTimes(2)
    expect(setMock.mock.calls[1][0]).toMatchObject({ DisableFallback: true })
  })

  it('先前保存失败的回拉不会覆盖后续已成功的保存', async () => {
    let rejectFirst: (err: Error) => void = () => undefined
    const firstWrite = new Promise<null>((_, reject) => {
      rejectFirst = reject
    })
    let resolveGet: (value: typeof defaultAIGlobalConfig) => void = () => undefined
    const delayedGet = new Promise<typeof defaultAIGlobalConfig>((resolve) => {
      resolveGet = resolve
    })
    setMock.mockImplementationOnce(() => firstWrite).mockResolvedValue(null)
    getMock.mockImplementation(() => delayedGet)

    const { result } = renderHook(() => useAIGlobalConfig())
    await act(async () => {
      void result.current[1].setAIGlobalConfig({ DisableFallback: true }).catch(() => undefined)
      await Promise.resolve()
    })
    await waitFor(() => {
      expect(setMock).toHaveBeenCalledTimes(1)
    })

    await act(async () => {
      rejectFirst(new Error('save-fail'))
    })
    await waitFor(() => {
      expect(getMock).toHaveBeenCalled()
    })

    await act(async () => {
      await result.current[1].setAIGlobalConfig({ RoutingPolicy: AIModelPolicyEnum.PolicyPerformance })
    })

    await act(async () => {
      resolveGet({ ...defaultAIGlobalConfig, DisableFallback: false })
      await delayedGet
    })

    expect(useAIGlobalConfigStore.getState().aiGlobalConfig).toMatchObject({
      DisableFallback: true,
      RoutingPolicy: AIModelPolicyEnum.PolicyPerformance,
    })
  })
})

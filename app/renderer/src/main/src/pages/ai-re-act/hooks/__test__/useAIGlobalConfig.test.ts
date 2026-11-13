import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AIModelPolicyEnum, defaultAIGlobalConfig } from '@/pages/ai-agent/defaultConstant'
import { grpcGetAIGlobalConfig, grpcSetAIGlobalConfig, type AIGlobalConfig } from '@/pages/ai-agent/aiModelList/utils'
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

  it('普通刷新的迟到回包不会覆盖后续已成功的保存', async () => {
    let resolveGet: (value: typeof defaultAIGlobalConfig) => void = () => undefined
    const delayedGet = new Promise<typeof defaultAIGlobalConfig>((resolve) => {
      resolveGet = resolve
    })
    getMock.mockImplementationOnce(() => delayedGet).mockResolvedValue({ ...defaultAIGlobalConfig })

    const { result } = renderHook(() => useAIGlobalConfig())
    await act(async () => {
      result.current[1].onRefresh(false)
      await Promise.resolve()
    })
    await waitFor(() => {
      expect(getMock).toHaveBeenCalled()
    })

    await act(async () => {
      await result.current[1].setAIGlobalConfig({ DisableFallback: true })
    })

    await act(async () => {
      resolveGet({ ...defaultAIGlobalConfig, DisableFallback: false })
      await delayedGet
    })

    expect(useAIGlobalConfigStore.getState().aiGlobalConfig).toMatchObject({
      DisableFallback: true,
    })
  })

  it('保存期间开始的刷新等待写入完成后再读配置', async () => {
    let finishSave!: (value: null) => void
    setMock.mockReturnValueOnce(new Promise<null>((resolve) => (finishSave = resolve)))
    const savedConfig = { ...defaultAIGlobalConfig, DisableFallback: true }
    getMock.mockResolvedValue(savedConfig)
    const { result } = renderHook(() => useAIGlobalConfig())

    await act(async () => {
      void result.current[1].setAIGlobalConfig(savedConfig)
    })
    await act(async () => result.current[1].onRefresh(false))
    expect(getMock).not.toHaveBeenCalled()

    await act(async () => finishSave(null))
    await waitFor(() => expect(getMock).toHaveBeenCalledTimes(1))
    expect(useAIGlobalConfigStore.getState().aiGlobalConfig).toEqual(savedConfig)
  })

  it('保存时清洗空数字字段并兜底必填字段', async () => {
    const dirtyConfig = {
      ...defaultAIGlobalConfig,
      GlobalWeight: '',
      IntelligentModels: [
        {
          ProviderId: '',
          Provider: { Type: 'openai', MaxTokens: '', Temperature: '', TopP: '', TopK: '', FrequencyPenalty: '' },
          ModelName: 'model-empty',
          ExtraParams: undefined,
        },
        {
          ProviderId: '7',
          Provider: { Type: 'openai', MaxTokens: 0, Temperature: 0.7, TopP: 0, TopK: 64, FrequencyPenalty: 0 },
          ModelName: 'model-valid',
          ExtraParams: [],
        },
      ],
    } as unknown as AIGlobalConfig

    const { result } = renderHook(() => useAIGlobalConfig())
    await act(async () => {
      await result.current[1].setAIGlobalConfig(dirtyConfig)
    })

    expect(setMock).toHaveBeenCalledTimes(1)
    const saved = setMock.mock.calls[0][0]
    // 空字符串数字字段删除、必填字段兜底
    expect(saved.GlobalWeight).toBe(0)
    expect(saved.IntelligentModels[0]).toEqual({
      ProviderId: '0',
      ContextOwnerId: expect.any(String),
      Provider: { Type: 'openai' },
      ModelName: 'model-empty',
      ExtraParams: [],
    })
    // 有效数字（含 0）原样保留
    expect(saved.IntelligentModels[1]).toEqual({
      ProviderId: '7',
      ContextOwnerId: expect.any(String),
      Provider: { Type: 'openai', MaxTokens: 0, Temperature: 0.7, TopP: 0, TopK: 64, FrequencyPenalty: 0 },
      ModelName: 'model-valid',
      ExtraParams: [],
    })
    // store 收到的是清洗后的快照
    expect(useAIGlobalConfigStore.getState().aiGlobalConfig).toEqual(saved)
  })
  it('新增同名提供商各自绑定，切换模型保留绑定，删除后重建使用新绑定', async () => {
    const model = {
      ProviderId: '0',
      ModelName: 'model-a',
      Provider: { Type: 'openai', BaseURL: 'https://example.test/v1' },
      ExtraParams: [],
    }
    const { result } = renderHook(() => useAIGlobalConfig())
    await act(async () => {
      await result.current[1].setAIGlobalConfig({ IntelligentModels: [{ ...model }, { ...model }] })
    })
    const added = setMock.mock.calls[0][0].IntelligentModels
    expect(added[0].ContextOwnerId).toMatch(/^[0-9a-f-]{36}$/)
    expect(added[0].ContextOwnerId).not.toBe(added[1].ContextOwnerId)
    await act(async () => {
      await result.current[1].setAIGlobalConfig({
        IntelligentModels: [{ ...added[0], ModelName: 'model-b' }, added[1]],
      })
    })
    expect(setMock.mock.calls[1][0].IntelligentModels[0].ContextOwnerId).toBe(added[0].ContextOwnerId)
    await act(async () => {
      await result.current[1].setAIGlobalConfig({ IntelligentModels: [added[1]] })
      await result.current[1].setAIGlobalConfig({ IntelligentModels: [added[1], { ...model }] })
    })
    expect(setMock.mock.calls[2][0].IntelligentModels).toEqual([added[1]])
    expect(setMock.mock.calls[3][0].IntelligentModels[0].ContextOwnerId).toBe(added[1].ContextOwnerId)
    expect(setMock.mock.calls[3][0].IntelligentModels[1].ContextOwnerId).not.toBe(added[0].ContextOwnerId)
  })

  it('企业配置刷新保留已有提供商绑定', async () => {
    const current = {
      ...defaultAIGlobalConfig,
      IntelligentModels: [
        {
          ProviderId: '0',
          ModelName: 'model-a',
          IsOnline: true,
          ContextOwnerId: '00000000-0000-4000-8000-000000000001',
          Provider: { Type: 'openai' },
          ExtraParams: [],
        },
      ],
    }
    getMock.mockResolvedValue(current)
    const { result } = renderHook(() => useAIGlobalConfig())
    await act(async () => {
      await result.current[1].getAIGlobalConfigAfterLogin([
        {
          id: 1,
          created_at: 0,
          updated_at: 0,
          isOpen: true,
          configName: 'AI',
          content: JSON.stringify({
            IntelligentModels: [{ ...current.IntelligentModels[0], ContextOwnerId: undefined }],
          }),
        },
      ])
    })
    expect(setMock.mock.calls[0][0].IntelligentModels[0].ContextOwnerId).toBe(
      current.IntelligentModels[0].ContextOwnerId,
    )
  })
})

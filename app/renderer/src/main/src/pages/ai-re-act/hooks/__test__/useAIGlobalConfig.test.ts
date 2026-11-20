import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AIModelPolicyEnum, defaultAIGlobalConfig } from '@/pages/ai-agent/defaultConstant'
import { grpcGetAIGlobalConfig, grpcSetAIGlobalConfig } from '@/pages/ai-agent/aiModelList/utils'
import type { AIGlobalConfig } from '@/pages/ai-agent/aiModelList/utils'
import type { API } from '@/services/swagger/resposeType'
import { useAIGlobalConfigStore } from '@/store/aiGlobalConfig'
import { yakitNotify } from '@/utils/notification'
import useAIGlobalConfig, { getCanonicalAIGlobalConfig } from '../useAIGlobalConfig'

vi.mock('@/utils/notification', () => ({ yakitNotify: vi.fn() }))
vi.mock('@/pages/ai-agent/aiModelList/utils', () => ({
  grpcGetAIGlobalConfig: vi.fn(),
  grpcSetAIGlobalConfig: vi.fn(),
}))

const getMock = vi.mocked(grpcGetAIGlobalConfig)
const setMock = vi.mocked(grpcSetAIGlobalConfig)

describe('useAIGlobalConfig', () => {
  beforeEach(() => {
    vi.mocked(yakitNotify).mockClear()
    getMock.mockReset()
    setMock.mockReset()
    getMock.mockImplementation(async () => setMock.mock.calls.at(-1)?.[0] ?? { ...defaultAIGlobalConfig })
    setMock.mockResolvedValue(null)
    useAIGlobalConfigStore.setState({
      aiGlobalConfig: { ...defaultAIGlobalConfig, RoutingPolicy: AIModelPolicyEnum.PolicyAuto, DisableFallback: false },
      isInit: false,
      queryLoading: false,
      persistedAiGlobalConfig: undefined,
      configSavePending: false,
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

  it.each([true, false])('写入和恢复读取均失败时结束保存并恢复可信配置，已有快照为 %s', async (hasSnapshot) => {
    const persisted = {
      ...defaultAIGlobalConfig,
      IntelligentModels: [{ ProviderId: '0', Provider: { Type: 'openai' }, ModelName: 'model-a', ExtraParams: [] }],
    }
    useAIGlobalConfigStore.setState({
      aiGlobalConfig: persisted,
      persistedAiGlobalConfig: hasSnapshot ? persisted : undefined,
    })
    setMock.mockRejectedValueOnce(new Error('save-fail'))
    getMock.mockRejectedValueOnce(new Error('recovery-fail'))
    const { result } = renderHook(() => useAIGlobalConfig())
    await act(async () => {
      await expect(
        result.current[1].setAIGlobalConfig({
          IntelligentModels: [{ ...persisted.IntelligentModels[0], ModelName: 'model-b' }],
        }),
      ).rejects.toThrow('save-fail')
    })
    const restored = persisted
    expect(useAIGlobalConfigStore.getState()).toMatchObject({
      aiGlobalConfig: restored,
      persistedAiGlobalConfig: hasSnapshot ? persisted : undefined,
      configSavePending: false,
    })
    expect(result.current[0].aiGlobalConfigRef.current).toEqual(restored)
    expect(result.current[0].total).toBe(restored.IntelligentModels.length)
    await act(async () => {
      await result.current[1].setAIGlobalConfig({ DisableFallback: true })
    })
    expect(setMock.mock.calls[1][0].IntelligentModels).toEqual(restored.IntelligentModels)
  })

  it('旧保存的恢复读取失败不会回滚新的在途保存', async () => {
    let rejectRecovery!: (error: Error) => void
    let finishSave!: (value: null) => void
    setMock.mockRejectedValueOnce(new Error('save-fail')).mockReturnValueOnce(
      new Promise<null>((resolve) => {
        finishSave = resolve
      }),
    )
    getMock.mockReturnValueOnce(
      new Promise<AIGlobalConfig>((_, reject) => {
        rejectRecovery = reject
      }),
    )
    const { result } = renderHook(() => useAIGlobalConfig())
    await act(async () => {
      await expect(result.current[1].setAIGlobalConfig({ DisableFallback: true })).rejects.toThrow('save-fail')
    })
    let saving!: Promise<void>
    await act(async () => {
      saving = result.current[1].setAIGlobalConfig({ RoutingPolicy: AIModelPolicyEnum.PolicyPerformance })
    })
    await act(async () => rejectRecovery(new Error('recovery-fail')))
    expect(useAIGlobalConfigStore.getState()).toMatchObject({
      aiGlobalConfig: { RoutingPolicy: AIModelPolicyEnum.PolicyPerformance, DisableFallback: true },
      configSavePending: true,
    })
    await act(async () => {
      finishSave(null)
      await saving
    })
    expect(useAIGlobalConfigStore.getState().configSavePending).toBe(false)
  })

  it.each([
    [true, true],
    [true, false],
    [false, true],
    [false, false],
  ])('连续切换模型后最新写入和恢复读取失败，前次成功 %s、已有快照 %s', async (firstSucceeded, hasSnapshot) => {
    const original = {
      ...defaultAIGlobalConfig,
      IntelligentModels: [{ ProviderId: '0', Provider: { Type: 'openai' }, ModelName: 'model-a', ExtraParams: [] }],
    }
    useAIGlobalConfigStore.setState({
      aiGlobalConfig: original,
      persistedAiGlobalConfig: hasSnapshot ? original : undefined,
    })
    let finishFirst!: () => void
    setMock
      .mockReturnValueOnce(
        new Promise<null>((resolve, reject) => {
          finishFirst = () => (firstSucceeded ? resolve(null) : reject(new Error('first-save-fail')))
        }),
      )
      .mockRejectedValueOnce(new Error('last-save-fail'))
    getMock.mockRejectedValueOnce(new Error('recovery-fail'))
    const { result } = renderHook(() => useAIGlobalConfig())
    let first!: Promise<void>
    let last!: Promise<void>
    await act(async () => {
      first = result.current[1]
        .setAIGlobalConfig({ IntelligentModels: [{ ...original.IntelligentModels[0], ModelName: 'model-b' }] })
        .catch(() => undefined)
      last = result.current[1]
        .setAIGlobalConfig({ IntelligentModels: [{ ...original.IntelligentModels[0], ModelName: 'model-c' }] })
        .catch(() => undefined)
    })
    await act(async () => {
      finishFirst()
      await Promise.all([first, last])
    })
    const restoredModel = firstSucceeded ? 'model-b' : 'model-a'
    expect(useAIGlobalConfigStore.getState().configSavePending).toBe(false)
    expect(useAIGlobalConfigStore.getState().aiGlobalConfig.IntelligentModels[0].ModelName).toBe(restoredModel)
    expect(useAIGlobalConfigStore.getState().persistedAiGlobalConfig).toEqual(
      hasSnapshot && !firstSucceeded ? original : undefined,
    )
    await act(async () => {
      await result.current[1].setAIGlobalConfig({ DisableFallback: true })
    })
    expect(setMock.mock.calls[2][0].IntelligentModels[0].ModelName).toBe(restoredModel)
  })

  it('写入成功即可关闭表单，首次回读失败只重试读取并更新引擎分配的归属', async () => {
    const model = { ProviderId: '0', Provider: { Type: 'openai' }, ModelName: 'model', ExtraParams: [] }
    const persisted = { ...defaultAIGlobalConfig, IntelligentModels: [{ ...model, ContextOwnerId: 'owner' }] }
    let finishRead!: (value: AIGlobalConfig) => void
    getMock.mockRejectedValueOnce(new Error('read failed')).mockReturnValueOnce(
      new Promise<AIGlobalConfig>((resolve) => {
        finishRead = resolve
      }),
    )
    const { result } = renderHook(() => useAIGlobalConfig())
    await act(async () => {
      await expect(result.current[1].setAIGlobalConfig({ IntelligentModels: [model] })).resolves.toBeUndefined()
    })
    expect(getMock).toHaveBeenCalledTimes(2)
    await act(async () => finishRead(persisted))
    expect(useAIGlobalConfigStore.getState().persistedAiGlobalConfig).toEqual(persisted)
    expect(setMock).toHaveBeenCalledTimes(1)
    expect(yakitNotify).not.toHaveBeenCalled()
  })

  it('两次回读失败后仍保留已写入的配置，下次刷新只读取一次', async () => {
    useAIGlobalConfigStore.setState({ persistedAiGlobalConfig: { ...defaultAIGlobalConfig, DisableFallback: false } })
    getMock.mockRejectedValueOnce(new Error('read failed')).mockRejectedValueOnce(new Error('retry failed'))
    const { result } = renderHook(() => useAIGlobalConfig())
    await act(async () => {
      await expect(result.current[1].setAIGlobalConfig({ DisableFallback: true })).resolves.toBeUndefined()
    })
    expect(useAIGlobalConfigStore.getState()).toMatchObject({
      aiGlobalConfig: { DisableFallback: true },
      persistedAiGlobalConfig: undefined,
      configSavePending: false,
    })
    expect(yakitNotify).toHaveBeenCalledExactlyOnceWith('warning', expect.any(String))
    await act(async () => result.current[1].onRefresh(false))
    expect(useAIGlobalConfigStore.getState().persistedAiGlobalConfig?.DisableFallback).toBe(true)
    expect(getMock).toHaveBeenCalledTimes(3)
    expect(setMock).toHaveBeenCalledTimes(1)
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
    getMock.mockImplementationOnce(() => delayedGet).mockImplementation(async () => setMock.mock.calls.at(-1)![0])

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
    getMock.mockImplementationOnce(() => delayedGet).mockImplementation(async () => setMock.mock.calls.at(-1)![0])

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
      Provider: { Type: 'openai' },
      ModelName: 'model-empty',
      ExtraParams: [],
    })
    // 有效数字（含 0）原样保留
    expect(saved.IntelligentModels[1]).toEqual({
      ProviderId: '7',
      Provider: { Type: 'openai', MaxTokens: 0, Temperature: 0.7, TopP: 0, TopK: 64, FrequencyPenalty: 0 },
      ModelName: 'model-valid',
      ExtraParams: [],
    })
    // store 收到的是清洗后的快照
    expect(useAIGlobalConfigStore.getState().aiGlobalConfig).toEqual(saved)
  })

  it('保存中只发布乐观配置，回读后发布引擎分配的归属', async () => {
    let finishSave!: (value: null) => void
    setMock.mockReturnValueOnce(new Promise<null>((resolve) => (finishSave = resolve)))
    const model = { ProviderId: '0', Provider: { Type: 'openai' }, ModelName: 'model', ExtraParams: [] }
    const persisted = { ...defaultAIGlobalConfig, IntelligentModels: [{ ...model, ContextOwnerId: 'owner' }] }
    getMock.mockResolvedValue(persisted)
    const { result } = renderHook(() => useAIGlobalConfig())
    let saving!: Promise<void>
    await act(async () => {
      saving = result.current[1].setAIGlobalConfig({ IntelligentModels: [model] })
    })
    expect(useAIGlobalConfigStore.getState()).toMatchObject({
      configSavePending: true,
      persistedAiGlobalConfig: undefined,
    })
    expect(getMock).not.toHaveBeenCalled()
    await act(async () => {
      finishSave(null)
      await saving
    })
    expect(useAIGlobalConfigStore.getState()).toMatchObject({
      configSavePending: false,
      persistedAiGlobalConfig: persisted,
    })
  })

  it('非 React 调用复用同一规范化回读', async () => {
    const first = getCanonicalAIGlobalConfig()
    const second = getCanonicalAIGlobalConfig()
    expect(first).toBe(second)
    await first
    expect(getMock).toHaveBeenCalledTimes(1)
  })

  it('企业配置刷新保留匹配条目的稳定归属', async () => {
    const model = { ProviderId: '0', Provider: { Type: 'openai' }, ModelName: 'model', ExtraParams: [], IsOnline: true }
    getMock.mockResolvedValue({ ...defaultAIGlobalConfig, IntelligentModels: [{ ...model, ContextOwnerId: 'owner' }] })
    const { result } = renderHook(() => useAIGlobalConfig())
    await act(async () =>
      result.current[1].getAIGlobalConfigAfterLogin([
        { configName: 'AI', content: JSON.stringify({ IntelligentModels: [model] }) } as API.SystemConfigList,
      ]),
    )
    expect(setMock.mock.calls[0][0].IntelligentModels[0].ContextOwnerId).toBe('owner')
  })
})

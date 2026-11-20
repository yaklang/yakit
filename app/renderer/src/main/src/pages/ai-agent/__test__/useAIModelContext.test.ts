import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createStore } from 'zustand'
import '../../ai-re-act/hooks/__test__/setupElectron'
import { useAIGlobalConfigStore } from '@/store/aiGlobalConfig'
import type { ModelContextState } from '@/pages/ai-re-act/hooks/aiRender'
import useAIModelContext, { useCurrentModelContextReset } from '../useContext/useAIModelContext'

const operations = vi.hoisted(() => ({ submit: vi.fn(), getModel: vi.fn() }))
vi.mock('../template/AIContextUsage/useSaveModelContext', () => ({ useSaveModelContext: () => operations.submit }))
vi.mock('../grpc', () => ({ grpcGetAIModelContext: operations.getModel }))
vi.mock('@/i18n/useI18nNamespaces', () => ({ useI18nNamespaces: () => ({ t: (key: string) => key }) }))

const store = createStore(() => ({
  modelContextUpdate: 0,
  execute: true,
  initLoading: false,
  updateStateCount: () => store.setState((state) => ({ modelContextUpdate: state.modelContextUpdate + 1 })),
}))
const settings = {
  provider: 'openai',
  model: 'model',
  context_key: 'model-key',
  threshold_tokens: 650000,
  minimum_threshold_tokens: 100000,
  disable_auto_adjust: true,
  source: 'manual' as const,
  pending: false,
}
const primary = { ModelName: 'model', ProviderId: '0', Provider: { Type: 'openai' }, ExtraParams: [] }
const rawData: { modelContext: ModelContextState } = { modelContext: { status: 'ready', generation: 0 } }
let currentRawData = rawData
const meta = { lifecycle: { current: true, closing: false } }
vi.mock('@/pages/ai-re-act/hooks/useCurrentDataBySession', () => ({
  useCurrentRawData: () => currentRawData,
  useCurrentStore: () => store,
  useCurrentMeta: () => meta,
}))
const response = {
  Provider: 'openai',
  Model: 'model',
  ContextKey: 'model-key',
  ThresholdTokens: 750000,
  MinimumThresholdTokens: 100000,
  DisableAutoAdjust: false,
  Source: 'manual',
}
const publish = (patch: Partial<ModelContextState>) => {
  rawData.modelContext = { ...rawData.modelContext, ...patch }
  store.getState().updateStateCount()
}

describe('上下文设置的数据来源', () => {
  beforeEach(() => {
    operations.submit.mockReset().mockReturnValue(true)
    operations.getModel.mockReset().mockResolvedValue(response)
    const config = useAIGlobalConfigStore.getState().aiGlobalConfig
    useAIGlobalConfigStore.setState({
      persistedAiGlobalConfig: { ...config, IntelligentModels: [primary] },
      configSavePending: false,
    })
    currentRawData = rawData
    rawData.modelContext = { status: 'ready', generation: 0, saved: settings }
    meta.lifecycle = { current: true, closing: false }
    store.setState({ execute: true, initLoading: false })
  })

  it('统一提交阈值和自动调整组合修改', () => {
    const { result } = renderHook(() => useAIModelContext())
    const patch = { threshold_tokens: 750000, disable_auto_adjust: true }
    expect(result.current.save(patch)).toBe(true)
    expect(operations.submit).toHaveBeenCalledExactlyOnceWith(patch)
    expect(operations.getModel).not.toHaveBeenCalled()
  })

  it.each(['settings', 'stream'] as const)('%s 只从 GET 快照提供配置', (source) => {
    rawData.modelContext.promptTokens = 125000
    const { result } = renderHook(() => useAIModelContext(source))
    expect(result.current).toMatchObject({
      thresholdTokens: 650000,
      editorThresholdTokens: 650000,
      editorDisableAutoAdjust: true,
      minimumThresholdTokens: 100000,
      promptTokens: 125000,
    })
  })

  it('流入口初次收到用量且没有配置时自动读取 GET', async () => {
    rawData.modelContext = { status: 'idle', generation: 0 }
    const { result } = renderHook(() => useAIModelContext('stream'))
    expect(operations.getModel).not.toHaveBeenCalled()
    act(() => publish({ promptTokens: 125000 }))
    await waitFor(() => expect(result.current.thresholdTokens).toBe(750000))
    expect(operations.getModel).toHaveBeenCalledExactlyOnceWith({ Config: primary }, true)
    expect(result.current.promptTokens).toBe(125000)
  })

  it('并存的流入口共用加载状态，避免重复自动 GET', async () => {
    rawData.modelContext = { status: 'idle', generation: 0, promptTokens: 125000 }
    const { result } = renderHook(() => [useAIModelContext('stream'), useAIModelContext('stream')])
    await waitFor(() => expect(result.current[0].thresholdTokens).toBe(750000))
    expect(operations.getModel).toHaveBeenCalledOnce()
  })

  it.each(['settings', 'stream'] as const)('打开 %s 弹层重新读取 GET，关闭不会读取', async (source) => {
    const { rerender } = renderHook(({ open }) => useAIModelContext(source, open), { initialProps: { open: false } })
    expect(operations.getModel).not.toHaveBeenCalled()
    rerender({ open: true })
    await waitFor(() => expect(rawData.modelContext.saved?.threshold_tokens).toBe(750000))
    rerender({ open: false })
    expect(operations.getModel).toHaveBeenCalledOnce()
    rerender({ open: true })
    await waitFor(() => expect(operations.getModel).toHaveBeenCalledTimes(2))
  })

  it('GET 失败可以从流入口重试，已有用量保持', async () => {
    operations.getModel.mockRejectedValueOnce(new Error('query failed'))
    rawData.modelContext = { status: 'idle', generation: 0, promptTokens: 125000 }
    const { result } = renderHook(() => useAIModelContext('stream'))
    await waitFor(() => expect(result.current.error).toBe('query failed'))
    expect(result.current.promptTokens).toBe(125000)
    await act(async () => {
      result.current.retry()
    })
    await waitFor(() => expect(result.current.thresholdTokens).toBe(750000))
  })

  it('失败修改使用调用时最新值重试，清除后重新 GET', async () => {
    const { result } = renderHook(() => useAIModelContext())
    const retry = result.current.retry
    rawData.modelContext.failedPatch = { threshold_tokens: 710000 }
    retry()
    rawData.modelContext.failedPatch = { threshold_tokens: 720000 }
    retry()
    expect(operations.submit.mock.calls).toEqual([
      [{ threshold_tokens: 710000 }, true],
      [{ threshold_tokens: 720000 }, true],
    ])
    const displayed = { threshold_tokens: 450000, disable_auto_adjust: false }
    retry(displayed)
    expect(operations.submit).toHaveBeenLastCalledWith(displayed, true)
    rawData.modelContext.failedPatch = undefined
    await act(async () => {
      retry(displayed)
    })
    expect(operations.getModel).toHaveBeenCalledOnce()
    expect(operations.submit).toHaveBeenCalledTimes(3)
  })

  it('待保存和排队修改只影响编辑值', () => {
    rawData.modelContext.promptTokens = 125000
    rawData.modelContext.pending = {
      baseline: settings,
      patch: { threshold_tokens: 700000, disable_auto_adjust: false },
      queuedPatch: { threshold_tokens: 800000 },
    }
    const { result } = renderHook(() => useAIModelContext('stream'))
    expect(result.current).toMatchObject({
      thresholdTokens: 650000,
      editorThresholdTokens: 800000,
      editorDisableAutoAdjust: false,
      promptTokens: 125000,
    })
  })

  it('未建流时也显示待保存编辑值', () => {
    store.setState({ execute: false })
    rawData.modelContext.saved = undefined
    rawData.modelContext.pending = { patch: { threshold_tokens: 550000, disable_auto_adjust: true } }
    const { result } = renderHook(() => useAIModelContext())
    expect(result.current).toMatchObject({ editorThresholdTokens: 550000, editorDisableAutoAdjust: true })
  })

  it('可见会话切换模型清空配置并保留会话用量，自动读取新模型', async () => {
    rawData.modelContext.promptTokens = 125000
    const { result } = renderHook(() => {
      useCurrentModelContextReset(true)
      return useAIModelContext('stream')
    })
    const nextModel = { ...primary, ModelName: 'next' }
    act(() =>
      useAIGlobalConfigStore.setState({
        persistedAiGlobalConfig: {
          ...useAIGlobalConfigStore.getState().persistedAiGlobalConfig!,
          IntelligentModels: [nextModel],
        },
      }),
    )
    await waitFor(() => expect(result.current.thresholdTokens).toBe(750000))
    expect(result.current.promptTokens).toBe(125000)
    expect(operations.getModel).toHaveBeenCalledExactlyOnceWith({ Config: nextModel }, true)
  })

  it('后台会话不跟随全局模型清空快照', () => {
    renderHook(() => useCurrentModelContextReset(false))
    act(() =>
      useAIGlobalConfigStore.setState({
        persistedAiGlobalConfig: {
          ...useAIGlobalConfigStore.getState().persistedAiGlobalConfig!,
          IntelligentModels: [{ ...primary, ModelName: 'next' }],
        },
      }),
    )
    expect(rawData.modelContext.saved).toBe(settings)
  })

  it('后台切换到同名不同归属的主模型，返回会话后自动刷新阈值并保留用量', async () => {
    const config = useAIGlobalConfigStore.getState().persistedAiGlobalConfig!
    const modelA = { ...primary, ContextOwnerId: 'owner-a' }
    const modelB = { ...primary, ContextOwnerId: 'owner-b' }
    useAIGlobalConfigStore.setState({ persistedAiGlobalConfig: { ...config, IntelligentModels: [modelA] } })
    rawData.modelContext = { status: 'idle', generation: 0, promptTokens: 50000 }
    operations.getModel
      .mockResolvedValueOnce({ ...response, ContextKey: 'key-a', ThresholdTokens: 100000 })
      .mockResolvedValueOnce({ ...response, ContextKey: 'key-b', ThresholdTokens: 500000 })
    const { result, rerender } = renderHook(
      ({ visible }) => {
        useCurrentModelContextReset(visible)
        return useAIModelContext('stream')
      },
      { initialProps: { visible: true } },
    )
    await waitFor(() => expect(result.current.thresholdTokens).toBe(100000))
    rerender({ visible: false })
    act(() => useAIGlobalConfigStore.setState({ persistedAiGlobalConfig: { ...config, IntelligentModels: [modelB] } }))
    expect(operations.getModel).toHaveBeenCalledOnce()
    rerender({ visible: true })
    await waitFor(() => expect(result.current.thresholdTokens).toBe(500000))
    expect(operations.getModel).toHaveBeenCalledTimes(2)
    expect(operations.getModel).toHaveBeenLastCalledWith({ Config: modelB }, true)
    expect(result.current.promptTokens).toBe(50000)
  })

  it('后台已读取当前主模型时，恢复可见保留该模型正在保存的修改', async () => {
    const { rerender } = renderHook(({ visible }) => useCurrentModelContextReset(visible), {
      initialProps: { visible: true },
    })
    rerender({ visible: false })
    const modelB = { ...primary, ModelName: 'model-b' }
    act(() =>
      useAIGlobalConfigStore.setState({
        persistedAiGlobalConfig: {
          ...useAIGlobalConfigStore.getState().persistedAiGlobalConfig!,
          IntelligentModels: [modelB],
        },
      }),
    )
    operations.getModel.mockResolvedValueOnce({ ...response, Model: 'model-b', ContextKey: 'key-b' })
    const panel = renderHook(() => useAIModelContext('settings', true))
    await waitFor(() => expect(rawData.modelContext.saved?.context_key).toBe('key-b'))
    panel.unmount()
    const pending = { patch: { threshold_tokens: 800000 }, baseline: rawData.modelContext.saved }
    act(() => publish({ pending }))
    rerender({ visible: true })
    expect(rawData.modelContext.pending).toBe(pending)
    expect(rawData.modelContext.saved).toBe(pending.baseline)
    expect(operations.getModel).toHaveBeenCalledOnce()
  })

  it('模型切换后丢弃旧 GET 返回', async () => {
    let resolveOld!: (value: typeof response) => void
    operations.getModel.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveOld = resolve
      }),
    )
    const { result } = renderHook(() => {
      useCurrentModelContextReset(true)
      return useAIModelContext('settings', true)
    })
    await waitFor(() => expect(operations.getModel).toHaveBeenCalledOnce())
    act(() =>
      useAIGlobalConfigStore.setState({
        persistedAiGlobalConfig: {
          ...useAIGlobalConfigStore.getState().persistedAiGlobalConfig!,
          IntelligentModels: [{ ...primary, ModelName: 'next' }],
        },
      }),
    )
    await waitFor(() => expect(operations.getModel).toHaveBeenCalledTimes(2))
    await act(async () => resolveOld({ ...response, ThresholdTokens: 900000 }))
    expect(result.current.thresholdTokens).toBe(750000)
  })

  it('生命周期替换后，旧 GET 返回时释放加载状态并保留已确认的阈值', async () => {
    let resolve!: (value: typeof response) => void
    operations.getModel.mockReturnValueOnce(
      new Promise((done) => {
        resolve = done
      }),
    )
    const { result } = renderHook(() => useAIModelContext('settings'))
    act(() => result.current.retry())
    expect(result.current.loading).toBe(true)
    meta.lifecycle = { current: true, closing: false }
    await act(async () => resolve(response))
    expect(rawData.modelContext.saved).toBe(settings)
    expect(result.current.loading).toBe(false)
  })

  it.each(['成功', '失败'])('断连后可立即打开设置重新 GET，旧请求%s时不打断新查询', async (outcome) => {
    let finishOld!: () => void
    let finishNew!: () => void
    operations.getModel
      .mockImplementationOnce(
        () =>
          new Promise((resolve, reject) => {
            finishOld = () => (outcome === '成功' ? resolve(response) : reject(new Error('connection closed')))
          }),
      )
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finishNew = () => resolve({ ...response, ThresholdTokens: 800000 })
          }),
      )
    rawData.modelContext = { status: 'idle', generation: 0, promptTokens: 125000 }
    renderHook(() => useAIModelContext('stream'))
    expect(operations.getModel).toHaveBeenCalledOnce()

    act(() => {
      meta.lifecycle.closing = true
      store.setState({ execute: false })
    })
    expect(rawData.modelContext.status).toBe('idle')
    const { result } = renderHook(() => useAIModelContext('settings', true))
    expect(operations.getModel).toHaveBeenCalledTimes(2)
    await act(async () => finishOld())
    expect(result.current.loading).toBe(true)
    expect(result.current.error).toBeUndefined()
    expect(result.current.thresholdTokens).toBeUndefined()
    await act(async () => finishNew())
    expect(result.current).toMatchObject({ loading: false, thresholdTokens: 800000 })
  })

  it('关闭弹层后丢弃尚未返回的 GET', async () => {
    let resolve!: (value: typeof response) => void
    operations.getModel.mockReturnValueOnce(
      new Promise((done) => {
        resolve = done
      }),
    )
    const { rerender } = renderHook(({ open }) => useAIModelContext('settings', open), { initialProps: { open: true } })
    rerender({ open: false })
    await act(async () => resolve(response))
    expect(rawData.modelContext.saved).toBe(settings)
  })

  it('切换会话后旧查询不能写入任一会话', async () => {
    let resolve!: (value: typeof response) => void
    operations.getModel.mockReturnValueOnce(
      new Promise((done) => {
        resolve = done
      }),
    )
    const { result, rerender } = renderHook(() => useAIModelContext('settings', true))
    const next = { modelContext: { status: 'idle' as const, generation: 0 } as ModelContextState }
    currentRawData = next
    rerender()
    await waitFor(() => expect(result.current.thresholdTokens).toBe(750000))
    await act(async () => resolve({ ...response, ThresholdTokens: 900000 }))
    expect(rawData.modelContext.saved).toBe(settings)
    expect(next.modelContext.saved?.threshold_tokens).toBe(750000)
  })

  it('保存开始后丢弃旧 GET，保存中的主动刷新不额外查询', async () => {
    let resolve!: (value: typeof response) => void
    operations.getModel.mockReturnValueOnce(
      new Promise((done) => {
        resolve = done
      }),
    )
    const { result } = renderHook(() => useAIModelContext('settings', true))
    act(() =>
      publish({
        generation: rawData.modelContext.generation + 1,
        pending: { baseline: settings, patch: { threshold_tokens: 800000 } },
      }),
    )
    await act(async () => {
      result.current.retry()
      resolve(response)
    })
    expect(operations.getModel).toHaveBeenCalledOnce()
    expect(rawData.modelContext.saved).toBe(settings)
    expect(result.current.editorThresholdTokens).toBe(800000)
  })

  it.each([
    { execute: false, initLoading: false },
    { execute: true, initLoading: true },
  ])('断开或准备重连时隐藏用量 %o', (connection) => {
    store.setState(connection)
    rawData.modelContext.promptTokens = 125000
    const { result } = renderHook(() => useAIModelContext('stream'))
    expect(result.current).toMatchObject({ enabled: false, promptTokens: undefined })
  })

  it('没有流用量时不显示用量入口', () => {
    const { result } = renderHook(() => useAIModelContext('stream'))
    expect(result.current).toMatchObject({ enabled: false, promptTokens: undefined })
  })
})

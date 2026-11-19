import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createStore } from 'zustand'
import '../../ai-re-act/hooks/__test__/setupElectron'
import { useAIGlobalConfigStore } from '@/store/aiGlobalConfig'
import useAIModelContext, { useCurrentModelContextReset } from '../useContext/useAIModelContext'

const operations = vi.hoisted(() => ({
  submit: vi.fn(),
  saveSource: vi.fn(),
  getModel: vi.fn(),
}))
vi.mock('../template/AIContextUsage/useSaveModelContext', () => ({
  useSaveModelContext: (source: string) => {
    operations.saveSource(source)
    return operations.submit
  },
}))
vi.mock('../grpc', () => ({ grpcGetAIModelContext: operations.getModel }))
vi.mock('@/i18n/useI18nNamespaces', () => ({ useI18nNamespaces: () => ({ t: (key: string) => key }) }))

const store = createStore(() => ({
  modelContextUpdate: 0,
  execute: true,
  initLoading: false,
  updateStateCount: vi.fn(),
}))
const settings = { context_key: 'model-key', threshold_tokens: 650000, disable_auto_adjust: true }
const stream = { context_key: 'model-key', threshold_tokens: 500000, disable_auto_adjust: false, prompt_tokens: 125000 }
const rawData = {
  modelContext: {
    status: 'ready',
    generation: 0,
    context: settings as typeof settings | undefined,
    saved: undefined as typeof settings | undefined,
    runtime: undefined as typeof stream | undefined,
    error: undefined as string | undefined,
    pending: undefined as
      | {
          baseline?: typeof stream
          queuedPatch?: { threshold_tokens?: number; disable_auto_adjust?: boolean }
          patch: { threshold_tokens: number; disable_auto_adjust: boolean }
        }
      | undefined,
    failedPatch: undefined as { threshold_tokens: number } | undefined,
  },
}
let currentRawData = rawData
const meta = { lifecycle: { current: true, closing: false } }
vi.mock('@/pages/ai-re-act/hooks/useCurrentDataBySession', () => ({
  useCurrentRawData: () => currentRawData,
  useCurrentStore: () => store,
  useCurrentMeta: () => meta,
}))

describe('上下文设置的数据来源', () => {
  beforeEach(() => {
    operations.submit.mockReset().mockReturnValue(true)
    operations.saveSource.mockClear()
    operations.getModel.mockReset().mockResolvedValue({
      Provider: 'openai',
      Model: 'model',
      ContextKey: 'model-key',
      ThresholdTokens: 750000,
      MinimumThresholdTokens: 100000,
      DisableAutoAdjust: false,
      Source: 'manual',
    })
    useAIGlobalConfigStore.setState({ persistedAiGlobalConfig: undefined, configSavePending: false })
    currentRawData = rawData
    rawData.modelContext.generation = 0
    rawData.modelContext.error = undefined
    rawData.modelContext.context = settings
    rawData.modelContext.saved = undefined
    store.setState({ execute: true, initLoading: false })
    rawData.modelContext.status = 'ready'
    rawData.modelContext.pending = undefined
    rawData.modelContext.runtime = undefined
    rawData.modelContext.failedPatch = undefined
  })

  it('统一导出保存与阈值操作，并原样提交组合修改', () => {
    const { result } = renderHook(() => useAIModelContext())
    const patch = { threshold_tokens: 750000, disable_auto_adjust: true }
    expect(result.current.save(patch)).toBe(true)
    result.current.setThreshold(600000)
    expect(operations.submit.mock.calls).toEqual([[patch], [{ threshold_tokens: 600000 }]])
    expect(operations.saveSource).toHaveBeenLastCalledWith('settings')
    expect(operations.getModel).not.toHaveBeenCalled()
  })

  it.each([true, false])('设置自动调整为 %s 时转换为禁用标记', (enabled) => {
    const { result } = renderHook(() => useAIModelContext('stream'))
    result.current.setAutoAdjust(enabled)
    expect(operations.submit).toHaveBeenCalledExactlyOnceWith({ disable_auto_adjust: !enabled })
    expect(operations.saveSource).toHaveBeenLastCalledWith('stream')
  })

  it('重试读取调用时最新失败修改，清除失败后改为查询', async () => {
    const config = useAIGlobalConfigStore.getState().aiGlobalConfig
    const primary = { ModelName: 'model', ProviderId: '0', Provider: { Type: 'openai' }, ExtraParams: [] }
    useAIGlobalConfigStore.setState({
      persistedAiGlobalConfig: { ...config, IntelligentModels: [primary] },
    })
    const { result } = renderHook(() => useAIModelContext())
    const retry = result.current.retry
    rawData.modelContext.failedPatch = { threshold_tokens: 710000 }
    retry()
    rawData.modelContext.failedPatch = { threshold_tokens: 720000 }
    retry()
    expect(operations.submit.mock.calls).toEqual([[{ threshold_tokens: 710000 }], [{ threshold_tokens: 720000 }]])
    expect(operations.getModel).not.toHaveBeenCalled()
    rawData.modelContext.failedPatch = undefined
    await act(async () => {
      await retry()
    })
    expect(operations.getModel).toHaveBeenCalledExactlyOnceWith({ Config: primary }, true)
    expect(rawData.modelContext.context?.threshold_tokens).toBe(750000)
  })

  it('显式 refresh 读取设置，默认挂载不会发起查询', async () => {
    const config = useAIGlobalConfigStore.getState().aiGlobalConfig
    const primary = { ModelName: 'model', ProviderId: '0', Provider: { Type: 'openai' }, ExtraParams: [] }
    useAIGlobalConfigStore.setState({
      persistedAiGlobalConfig: { ...config, IntelligentModels: [primary] },
    })
    const { result } = renderHook(() => useAIModelContext())
    expect(operations.getModel).not.toHaveBeenCalled()
    await act(async () => {
      await result.current.refresh()
    })
    expect(operations.getModel).toHaveBeenCalledExactlyOnceWith({ Config: primary }, true)
  })

  it('流来源的刷新和无失败重试不查询设置，保存失败仍提交原修改', async () => {
    const { result } = renderHook(() => useAIModelContext('stream'))
    await act(async () => {
      await result.current.refresh()
      await result.current.retry()
    })
    expect(operations.getModel).not.toHaveBeenCalled()
    expect(operations.submit).not.toHaveBeenCalled()
    rawData.modelContext.failedPatch = { threshold_tokens: 680000 }
    result.current.retry()
    expect(operations.submit).toHaveBeenCalledExactlyOnceWith({ threshold_tokens: 680000 })
    expect(operations.saveSource).toHaveBeenLastCalledWith('stream')
  })

  it('只有可见输入区的当前会话响应主模型变化', () => {
    const config = useAIGlobalConfigStore.getState().aiGlobalConfig
    const setModel = (name: string) =>
      useAIGlobalConfigStore.setState({
        aiGlobalConfig: {
          ...config,
          IntelligentModels: [{ ModelName: name, ProviderId: '0', Provider: { Type: 'openai' }, ExtraParams: [] }],
        },
      })
    const background = { modelContext: { ...rawData.modelContext } }
    currentRawData = background
    renderHook(() => useCurrentModelContextReset(false))
    act(() => setModel('first'))
    currentRawData = rawData
    renderHook(() => useCurrentModelContextReset(true))
    act(() => setModel('second'))
    expect(rawData.modelContext).toMatchObject({ status: 'idle', generation: 1 })
    expect(rawData.modelContext.context).toBeUndefined()
    expect(background.modelContext.context).toBe(settings)
    expect(background.modelContext.generation).toBe(0)
  })

  it('只在查询时加载，等流首包时保留上一次阈值并提示等待', () => {
    rawData.modelContext.status = 'loading'
    const { result, rerender } = renderHook(() => useAIModelContext())
    expect(result.current).toMatchObject({ loading: true, waitingForContext: false })
    rawData.modelContext.status = 'idle'
    rerender()
    expect(result.current).toMatchObject({ loading: false, waitingForContext: true, editorThresholdTokens: 650000 })
  })

  it('未建流也无已读设置时，编辑器仍显示等待 Set 确认的修改', () => {
    store.setState({ execute: false })
    rawData.modelContext.context = undefined
    rawData.modelContext.pending = { patch: { threshold_tokens: 550000, disable_auto_adjust: true } }
    const { result } = renderHook(() => useAIModelContext())
    expect(result.current).toMatchObject({
      editorThresholdTokens: 550000,
      editorDisableAutoAdjust: true,
      waitingForContext: false,
    })
  })

  it('热更新等待回执时编辑器保留用户提交的值，用量仍按流计算', () => {
    rawData.modelContext.runtime = stream
    rawData.modelContext.pending = { baseline: stream, patch: { threshold_tokens: 700000, disable_auto_adjust: true } }
    const { result } = renderHook(() => useAIModelContext('stream'))
    expect(result.current).toMatchObject({
      loading: false,
      waitingForContext: true,
      thresholdTokens: 500000,
      editorThresholdTokens: 700000,
      editorDisableAutoAdjust: true,
    })
  })

  it('已排队的修改优先显示，未再次编辑的字段沿用待确认的值', () => {
    rawData.modelContext.runtime = stream
    rawData.modelContext.pending = {
      baseline: stream,
      patch: { threshold_tokens: 700000, disable_auto_adjust: true },
      queuedPatch: { threshold_tokens: 750000 },
    }
    const { result } = renderHook(() => useAIModelContext('stream'))
    expect(result.current).toMatchObject({
      editorThresholdTokens: 750000,
      editorDisableAutoAdjust: true,
      thresholdTokens: 500000,
    })
  })

  it('显示缺少 context_key 的具体错误', () => {
    const { result, unmount } = renderHook(() => useAIModelContext())
    act(() => {
      rawData.modelContext = {
        ...rawData.modelContext,
        status: 'idle',
        context: undefined,
        error: 'AIContextUsage.missingContextKey',
        failedPatch: { threshold_tokens: 448000 },
      }
      store.setState(({ modelContextUpdate }) => ({ modelContextUpdate: modelContextUpdate + 1 }))
    })
    expect(result.current.error).toBe('AIContextUsage.missingContextKey')
    unmount()
    const reopened = renderHook(() => useAIModelContext())
    expect(reopened.result.current.error).toBe('AIContextUsage.missingContextKey')
  })

  it('热更新失败后重新打开，输入框和开关使用更新前确认的设置', () => {
    rawData.modelContext.failedPatch = { threshold_tokens: 448000 }
    rawData.modelContext.error = 'rejected'
    rawData.modelContext.runtime = { ...stream, threshold_tokens: 448000, disable_auto_adjust: false }
    const { result } = renderHook(() => useAIModelContext('stream'))
    expect(result.current).toMatchObject({
      error: 'rejected',
      editorThresholdTokens: settings.threshold_tokens,
      editorDisableAutoAdjust: settings.disable_auto_adjust,
    })
  })

  it('切换模型后，AI 设置可以使用查询到的新阈值，无需等待下一个流事件', () => {
    const { result } = renderHook(() => useAIModelContext())
    expect(result.current).toMatchObject({ thresholdTokens: 650000, disableAutoAdjust: true })
  })

  it('会话启动时立即读取随会话数据清空的快照', () => {
    store.setState({ execute: false })
    const { result } = renderHook(() => useAIModelContext())
    expect(result.current.thresholdTokens).toBe(650000)
    act(() => {
      rawData.modelContext = { ...rawData.modelContext, status: 'idle', context: undefined, runtime: undefined }
      store.setState({ execute: true })
    })
    expect(result.current.thresholdTokens).toBeUndefined()
  })

  it('没有流数据时，即使 AI 设置有值也不显示用量', () => {
    const { result } = renderHook(() => useAIModelContext('stream'))
    expect(result.current).toMatchObject({ enabled: false, thresholdTokens: undefined })
  })

  it.each([
    { execute: false, initLoading: false },
    { execute: true, initLoading: true },
  ])('断开或准备重连时不展示旧连接的用量 %o', (connection) => {
    store.setState(connection)
    rawData.modelContext.runtime = stream
    const { result } = renderHook(() => useAIModelContext('stream'))
    expect(result.current).toMatchObject({ enabled: false, promptTokens: undefined, thresholdTokens: undefined })
  })

  it('用量只显示流中返回的值', () => {
    rawData.modelContext.runtime = stream
    rawData.modelContext.failedPatch = { threshold_tokens: 700000 }
    const { result } = renderHook(() => useAIModelContext('stream'))
    expect(result.current).toMatchObject({
      thresholdTokens: 500000,
      promptTokens: 125000,
      disableAutoAdjust: false,
    })
  })
})

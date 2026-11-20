import './setupElectron'
import { act, cleanup, renderHook } from '@testing-library/react'
import { useSaveModelContext } from '@/pages/ai-agent/template/AIContextUsage/useSaveModelContext'
import useAIModelContext, { useCurrentModelContextReset } from '@/pages/ai-agent/useContext/useAIModelContext'
import { getModelContextUsage } from '@/pages/ai-agent/utils/modelContextFormat'
import { getCanonicalAIGlobalConfig } from '../useAIGlobalConfig'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ModelContextSnapshot } from '../aiRender'
import { getStreamModelContext } from '../modelContext'
import { globalSessionEngine } from '../ChatMultiSessionController'
import { useAIGlobalConfigStore } from '@/store/aiGlobalConfig'
import { defaultAIGlobalConfig } from '@/pages/ai-agent/defaultConstant'
import { grpcAIMessageHandlers } from '../grpcStreamHandler/grpcAIOutputEventHandlers'
import { makeGrpcJsonRes, makeHandlerRequest } from './fixtures'

const { getModel, setModel } = vi.hoisted(() => ({ getModel: vi.fn(), setModel: vi.fn() }))
vi.mock('@/pages/ai-agent/grpc', () => ({ grpcGetAIModelContext: getModel, grpcSetAIModelContext: setModel }))
let currentSession: ReturnType<typeof globalSessionEngine.ensureSession>
let currentSessionId = 'session-a'
vi.mock('../useCurrentDataBySession', () => ({
  useCurrentRawData: () => currentSession.rawData,
  useCurrentStore: () => currentSession.store.renderStore,
  useCurrentRequest: () => currentSession.request,
  useCurrentMeta: () => currentSession.meta,
}))
vi.mock('../useCurrentSessionId', () => ({ default: () => currentSessionId }))
vi.mock('@/i18n/useI18nNamespaces', () => ({ useI18nNamespaces: () => ({ t: (key: string) => key }) }))

const saved: ModelContextSnapshot = {
  provider: 'openai',
  model: 'model',
  context_key: 'owner:model',
  threshold_tokens: 500000,
  source: 'default',
  pending: false,
  disable_auto_adjust: false,
}

describe('component model context saving and stream acknowledgements', () => {
  const controller = globalSessionEngine
  let session: ReturnType<typeof controller.ensureSession>
  let submit: ReturnType<typeof useSaveModelContext>
  const push = (data: Record<string, unknown> = {}, isSync = false) =>
    grpcAIMessageHandlers.model_context(
      makeHandlerRequest({
        ...session,
        sessionId: 'session-a',
        res: makeGrpcJsonRes(
          'model_context',
          { ...saved, prompt_tokens: 125000, ...data },
          {
            NodeId: 'model_context',
            IsSync: isSync,
          },
        ),
      }),
    )
  beforeEach(() => {
    vi.useFakeTimers()
    useAIGlobalConfigStore.setState({
      configSavePending: false,
      persistedAiGlobalConfig: {
        ...defaultAIGlobalConfig,
        IntelligentModels: [
          {
            ModelName: 'model',
            ProviderId: '0',
            Provider: { Type: 'openai' },
            ExtraParams: [],
            ContextOwnerId: 'owner',
          },
        ],
      },
    })
    controller.registerDraftSession('session-a', 'test-page')
    session = controller.ensureSession('session-a')
    session.store.getState().updateState({ execute: true })
    vi.spyOn(controller, 'handleSendMessage').mockReturnValue(true)
    push({ prompt_tokens: 0 })
    currentSession = session
    currentSessionId = 'session-a'
    setModel.mockReset()
    submit = renderHook(() => useSaveModelContext('settings')).result.current
  })
  afterEach(() => {
    cleanup()
    vi.clearAllTimers()
    controller.discardUnsentDraft('session-a', 'test-page')
    controller.discardUnsentDraft('session-b', 'test-page')
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('writes live values to rawData and increments the session update counter once', () => {
    const before = session.store.getState().modelContextUpdate
    push({ threshold_tokens: 600000, disable_auto_adjust: true })
    expect(session.rawData.modelContext.context).toMatchObject({ threshold_tokens: 600000, disable_auto_adjust: true })
    expect(session.store.getState().modelContextUpdate).toBe(before + 1)
  })

  it.each(['model-b', saved.model])('uses only the selected model and its key after switching to %s', async (model) => {
    const config = useAIGlobalConfigStore.getState().persistedAiGlobalConfig!
    const target = { ...config.IntelligentModels[0], ModelName: model, ContextOwnerId: 'owner-b' }
    const nextConfig = { ...config, IntelligentModels: [target, ...config.IntelligentModels] }
    getModel.mockReset().mockResolvedValue({ ContextKey: 'key-b' })
    renderHook(() => useCurrentModelContextReset(true))
    const save = renderHook(() => useSaveModelContext('stream')).result.current
    useAIGlobalConfigStore.setState({ aiGlobalConfig: nextConfig, configSavePending: true })
    await push({ prompt_tokens: 100000 })
    expect(session.rawData.modelContext.saved).toBeUndefined()
    useAIGlobalConfigStore.setState({ persistedAiGlobalConfig: nextConfig, configSavePending: false })
    await push({ model, context_key: 'key-b', prompt_tokens: 200000, threshold_tokens: 700000 })
    await push({ prompt_tokens: 150000 })
    await vi.advanceTimersByTimeAsync(0)
    expect(getModel).toHaveBeenCalledTimes(model === saved.model ? 1 : 0)
    expect(session.rawData.modelContext.saved?.context_key).toBe('key-b')
    expect(session.rawData.modelContext.runtime).toMatchObject({
      context_key: 'key-b',
      threshold_tokens: 700000,
      prompt_tokens: 200000,
    })
    expect(save({ threshold_tokens: 800000 })).toBe(true)
    await vi.advanceTimersByTimeAsync(0)
    expect(controller.handleSendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        params: expect.objectContaining({ Params: { ModelContextKey: 'key-b', RuntimeContextSizeLimit: 800000 } }),
      }),
    )
  })

  it('discards a late key lookup after another model switch', async () => {
    const config = useAIGlobalConfigStore.getState().persistedAiGlobalConfig!
    const original = config.IntelligentModels[0]
    let finishLookup!: (value: { ContextKey: string }) => void
    getModel.mockReset().mockImplementation(
      () =>
        new Promise((resolve) => {
          finishLookup = resolve
        }),
    )
    renderHook(() => useCurrentModelContextReset(true))
    useAIGlobalConfigStore.setState({
      persistedAiGlobalConfig: { ...config, IntelligentModels: [{ ...original, ContextOwnerId: 'owner-b' }] },
    })
    push({ context_key: 'key-b' })
    await vi.advanceTimersByTimeAsync(0)
    useAIGlobalConfigStore.setState({
      persistedAiGlobalConfig: { ...config, IntelligentModels: [{ ...original, ModelName: 'model-c' }] },
    })
    finishLookup({ ContextKey: 'key-b' })
    await vi.advanceTimersByTimeAsync(0)
    expect(session.rawData.modelContext.saved).toBeUndefined()
    push({ model: 'model-c', context_key: 'key-c' })
    expect(session.rawData.modelContext.saved?.context_key).toBe('key-c')
    expect(session.rawData.modelContext.runtime?.context_key).toBe('key-c')
  })

  it.each(['model-b', 'model'])('切换模型 %s 保留 121K 用量，以新配置计算占比并使用新 key 保存', async (model) => {
    push({ prompt_tokens: 121000, threshold_tokens: 100000 })
    const config = useAIGlobalConfigStore.getState().persistedAiGlobalConfig!
    const target = { ...config.IntelligentModels[0], ModelName: model, ContextOwnerId: 'owner-b' }
    getModel.mockReset().mockResolvedValue({
      Provider: 'openai',
      Model: model,
      ContextKey: 'key-b',
      ThresholdTokens: 500000,
      MinimumThresholdTokens: 100000,
      DisableAutoAdjust: true,
      Source: 'manual',
    })
    const { result } = renderHook(() => {
      useCurrentModelContextReset(true)
      return useAIModelContext('stream')
    })
    await act(async () => {
      useAIGlobalConfigStore.setState({ persistedAiGlobalConfig: { ...config, IntelligentModels: [target] } })
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(getModel).toHaveBeenCalledWith({ Config: target }, true)
    expect(result.current).toMatchObject({
      enabled: true,
      promptTokens: 121000,
      thresholdTokens: 500000,
      editorThresholdTokens: 500000,
      editorDisableAutoAdjust: true,
    })
    expect(
      getModelContextUsage(result.current.enabled, result.current.promptTokens, result.current.thresholdTokens),
    ).toMatchObject({ percent: 24, remaining: 379000 })
    await act(async () => {
      result.current.save({ threshold_tokens: 600000 })
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(controller.handleSendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        params: expect.objectContaining({ Params: { ModelContextKey: 'key-b', RuntimeContextSizeLimit: 600000 } }),
      }),
    )
    act(() => {
      push({
        model,
        context_key: 'key-b',
        prompt_tokens: 0,
        threshold_tokens: 600000,
        disable_auto_adjust: true,
        change: { id: 'new-manual', reason: 'manual' },
      })
    })
    expect(result.current).toMatchObject({ promptTokens: 121000, thresholdTokens: 600000, saving: false })
  })

  it.each(['迟到查询', '新模型流先到'])('切换模型时%s不会覆盖新数据', async (scenario) => {
    push({ prompt_tokens: 121000, threshold_tokens: 100000 })
    const config = useAIGlobalConfigStore.getState().persistedAiGlobalConfig!
    const select = (name: string) =>
      useAIGlobalConfigStore.setState({
        persistedAiGlobalConfig: {
          ...config,
          IntelligentModels: [{ ...config.IntelligentModels[0], ModelName: name, ContextOwnerId: name }],
        },
      })
    const response = (name: string) => ({
      Provider: 'openai',
      Model: name,
      ContextKey: name,
      ThresholdTokens: 500000,
      MinimumThresholdTokens: 100000,
      DisableAutoAdjust: true,
      Source: 'manual',
    })
    let finish!: (value: ReturnType<typeof response>) => void
    getModel
      .mockReset()
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finish = resolve
          }),
      )
      .mockResolvedValue(response('model-c'))
    renderHook(() => useCurrentModelContextReset(true))
    select('model-b')
    await vi.advanceTimersByTimeAsync(0)
    if (scenario === '迟到查询') {
      select('model-c')
      await vi.advanceTimersByTimeAsync(0)
    } else {
      push({ model: 'model-b', context_key: 'model-b', prompt_tokens: 140000, threshold_tokens: 700000 })
    }
    finish(response('model-b'))
    await vi.advanceTimersByTimeAsync(0)
    expect(getStreamModelContext(session.rawData.modelContext)).toMatchObject(
      scenario === '迟到查询'
        ? { context_key: 'model-c', threshold_tokens: 500000 }
        : { context_key: 'model-b', prompt_tokens: 140000, threshold_tokens: 700000 },
    )
    const { result } = renderHook(() => useAIModelContext('stream'))
    expect(result.current.promptTokens).toBe(scenario === '迟到查询' ? 121000 : 140000)
  })

  it('keeps the model minimum when subsequent usage events omit it', () => {
    push({ minimum_threshold_tokens: 75000 })
    push({ prompt_tokens: 200000 })
    expect(session.rawData.modelContext.runtime?.minimum_threshold_tokens).toBe(75000)
    expect(session.rawData.modelContext.saved?.minimum_threshold_tokens).toBe(75000)
  })

  it('keeps unknown usage until a live matching event and preserves usage on a zero receipt', () => {
    expect(session.rawData.modelContext.context?.prompt_tokens).toBeUndefined()
    push()
    push({ prompt_tokens: 0 })
    expect(session.rawData.modelContext.context?.prompt_tokens).toBe(125000)
  })

  it('ignores another identity and history replay during a pending edit', () => {
    submit({ threshold_tokens: 600000 })
    const before = session.rawData.modelContext.runtime
    push({ context_key: 'other' })
    push({}, true)
    expect(session.rawData.modelContext.runtime).toBe(before)
  })

  it('accepts a live manual confirmation after the hotpatch is sent', async () => {
    expect(submit({ threshold_tokens: 600000 })).toBe(true)
    await vi.advanceTimersByTimeAsync(0)
    expect(controller.handleSendMessage).toHaveBeenCalledExactlyOnceWith({
      token: 'session-a',
      type: 'casual',
      params: {
        IsConfigHotpatch: true,
        HotpatchType: 'RuntimeContextSizeLimit',
        Params: { ModelContextKey: saved.context_key, RuntimeContextSizeLimit: 600000 },
      },
      onSendError: expect.any(Function),
    })
    push({ threshold_tokens: 600000, pending: true, change: { id: 'pending', reason: 'manual' } })
    expect(session.rawData.modelContext.pending).toBeDefined()
    push({ threshold_tokens: 600000, change: { id: 'auto', reason: 'confirmed' } })
    expect(session.rawData.modelContext.pending).toBeDefined()
    push({ threshold_tokens: 600000, change: { id: 'manual', reason: 'manual' } }, true)
    expect(session.rawData.modelContext.pending).toBeDefined()
    push({ threshold_tokens: 600000, change: { id: 'manual', reason: 'manual' } })
    expect(session.rawData.modelContext.pending).toBeUndefined()
    expect(session.rawData.modelContext.context?.threshold_tokens).toBe(600000)
  })

  it('rolls back on asynchronous send rejection', async () => {
    vi.mocked(controller.handleSendMessage).mockImplementationOnce(({ onSendError }) => {
      queueMicrotask(() => onSendError?.(new Error('offline')))
      return true
    })
    submit({ threshold_tokens: 600000 })
    await vi.advanceTimersByTimeAsync(0)
    expect(session.rawData.modelContext).toMatchObject({
      context: { threshold_tokens: 500000 },
      error: 'offline',
      failedPatch: { threshold_tokens: 600000 },
      pending: undefined,
    })
  })

  it('rolls back when the pending chat channel cannot accept the update', async () => {
    currentSessionId = 'other-visible-session'
    session.request.TimelineSessionID = 'session-a'
    vi.mocked(controller.handleSendMessage).mockReturnValueOnce(false)
    const { result } = renderHook(() => useSaveModelContext('stream'))
    result.current({ threshold_tokens: 600001 })
    await vi.advanceTimersByTimeAsync(0)
    expect(controller.handleSendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        token: 'session-a',
        params: expect.objectContaining({
          Params: { ModelContextKey: saved.context_key, RuntimeContextSizeLimit: 600001 },
        }),
      }),
    )
    expect(session.rawData.modelContext).toMatchObject({
      failedPatch: { threshold_tokens: 600001 },
      error: 'AIContextUsage.sessionUnavailable',
      pending: undefined,
    })
  })

  it('retains the rejected change after normal events until retry', async () => {
    const patch = { disable_auto_adjust: true }
    submit(patch)
    await vi.advanceTimersByTimeAsync(0)
    push({ error: 'save rejected' })
    push({ prompt_tokens: 25000 })
    expect(session.rawData.modelContext.error).toBe('save rejected')
    expect(session.rawData.modelContext.failedPatch).toEqual(patch)
    vi.mocked(controller.handleSendMessage).mockClear()
    expect(submit(session.rawData.modelContext.failedPatch!)).toBe(true)
    await vi.advanceTimersByTimeAsync(0)
    expect(controller.handleSendMessage).toHaveBeenCalledExactlyOnceWith({
      token: 'session-a',
      type: 'casual',
      params: {
        IsConfigHotpatch: true,
        HotpatchType: 'RuntimeContextSizeLimit',
        Params: { ModelContextKey: saved.context_key, RuntimeContextSizeLimit: 0, DisableContextAutoAdjust: true },
      },
      onSendError: expect.any(Function),
    })
    expect(session.rawData.modelContext.error).toBeUndefined()
    expect(session.rawData.modelContext.failedPatch).toBeUndefined()
  })

  it('does not submit unchanged settings', async () => {
    expect(submit({ threshold_tokens: 500000 })).toBe(false)
    expect(submit({ disable_auto_adjust: false })).toBe(false)
    await vi.advanceTimersByTimeAsync(0)
    expect(controller.handleSendMessage).not.toHaveBeenCalled()
  })

  it('rolls back to the latest confirmed automatic value', async () => {
    submit({ threshold_tokens: 600000 })
    await vi.advanceTimersByTimeAsync(0)
    push({ threshold_tokens: 450000, source: 'learned', change: { id: 'learned', reason: 'confirmed' } })
    expect(session.rawData.modelContext.pending).toBeDefined()
    await vi.advanceTimersByTimeAsync(10000)
    expect(session.rawData.modelContext.context?.threshold_tokens).toBe(450000)
  })

  it('rolls back at 10 seconds and accepts a later valid current-model state', async () => {
    submit({ threshold_tokens: 600000 })
    await vi.advanceTimersByTimeAsync(9999)
    expect(session.rawData.modelContext.pending).toBeDefined()
    await vi.advanceTimersByTimeAsync(1)
    expect(session.rawData.modelContext).toMatchObject({
      context: { threshold_tokens: 500000 },
      error: 'AIContextUsage.saveTimeout',
      pending: undefined,
    })
    push({ threshold_tokens: 600000, change: { id: 'late', reason: 'manual' } })
    expect(session.rawData.modelContext.context?.threshold_tokens).toBe(600000)
    expect(session.rawData.modelContext.error).toBeUndefined()
  })

  it('preserves false and allows saved automatic thresholds below the manual floor', async () => {
    push({ threshold_tokens: 80000, disable_auto_adjust: true })
    submit({ disable_auto_adjust: false })
    await vi.advanceTimersByTimeAsync(0)
    expect(controller.handleSendMessage).toHaveBeenCalledWith({
      token: 'session-a',
      type: 'casual',
      params: {
        IsConfigHotpatch: true,
        HotpatchType: 'RuntimeContextSizeLimit',
        Params: { ModelContextKey: saved.context_key, RuntimeContextSizeLimit: 0, DisableContextAutoAdjust: false },
      },
      onSendError: expect.any(Function),
    })
    push({ threshold_tokens: 80000, disable_auto_adjust: false, change: { id: 'manual', reason: 'manual' } })
    expect(session.rawData.modelContext.context).toMatchObject({ threshold_tokens: 80000, disable_auto_adjust: false })
    expect(session.rawData.modelContext.pending).toBeUndefined()
  })

  it('updates usage for an unfamiliar change without confirming a pending edit', async () => {
    submit({ threshold_tokens: 600000 })
    await vi.advanceTimersByTimeAsync(0)
    push({ threshold_tokens: 600000, prompt_tokens: 12000, change: { id: 'new', reason: 'other' } })
    expect(session.rawData.modelContext.promptTokens).toBe(12000)
    expect(session.rawData.modelContext.pending).toBeDefined()
  })

  it('ignores a null event payload', () => {
    const before = session.rawData.modelContext
    grpcAIMessageHandlers.model_context(
      makeHandlerRequest({
        ...session,
        sessionId: 'session-a',
        res: makeGrpcJsonRes('model_context', null, { NodeId: 'model_context' }),
      }),
    )
    expect(session.rawData.modelContext).toBe(before)
  })

  const response = {
    ContextKey: saved.context_key,
    Provider: saved.provider,
    Model: saved.model,
    ThresholdTokens: 600000,
    MinimumThresholdTokens: 100000,
    Source: 'manual',
    DisableAutoAdjust: false,
  }

  it.each(['loading', 'error'] as const)('saves by Config while the query state is %s', async (status) => {
    session.store.getState().updateState({ execute: false })
    session.rawData.modelContext = { status, generation: 2 }
    setModel.mockResolvedValueOnce({ ...response, ThresholdTokens: '640000', MinimumThresholdTokens: '75000' })
    expect(submit({ threshold_tokens: 640000 })).toBe(true)
    await vi.advanceTimersByTimeAsync(0)
    expect(setModel).toHaveBeenCalledExactlyOnceWith(
      {
        Config: useAIGlobalConfigStore.getState().persistedAiGlobalConfig?.IntelligentModels[0],
        ThresholdTokens: 640000,
      },
      true,
    )
    expect(session.rawData.modelContext).toMatchObject({
      generation: 3,
      saved: { threshold_tokens: 640000, minimum_threshold_tokens: 75000 },
      pending: undefined,
    })
  })

  it('uses the canonical model when its owner ID is filled during saving', async () => {
    session.store.getState().updateState({ execute: false })
    session.rawData.modelContext = { status: 'idle', generation: 0 }
    const config = useAIGlobalConfigStore.getState().persistedAiGlobalConfig!
    useAIGlobalConfigStore.setState({ persistedAiGlobalConfig: undefined })
    vi.mocked(getCanonicalAIGlobalConfig).mockImplementationOnce(async () => {
      useAIGlobalConfigStore.setState({ persistedAiGlobalConfig: config })
      return config
    })
    setModel.mockResolvedValueOnce(response)
    submit({ threshold_tokens: 600000 })
    await vi.advanceTimersByTimeAsync(0)
    expect(setModel).toHaveBeenCalledExactlyOnceWith(
      { Config: config.IntelligentModels[0], ThresholdTokens: 600000 },
      true,
    )
    expect(session.rawData.modelContext.context?.threshold_tokens).toBe(600000)
  })

  it.each(['loading', 'error'] as const)(
    'targets the current Config instead of a background session key while settings are %s',
    async (status) => {
      session.store.getState().updateState({ execute: false })
      session.rawData.modelContext.status = status
      const config = useAIGlobalConfigStore.getState().persistedAiGlobalConfig!
      const nextConfig = {
        ...config,
        IntelligentModels: [{ ...config.IntelligentModels[0], ContextOwnerId: 'new-owner' }],
      }
      useAIGlobalConfigStore.setState({ persistedAiGlobalConfig: nextConfig })
      setModel.mockResolvedValueOnce({ ...response, ContextKey: 'new-key' })
      expect(submit({ threshold_tokens: 600000 })).toBe(true)
      await vi.advanceTimersByTimeAsync(0)
      expect(setModel).toHaveBeenCalledExactlyOnceWith(
        { Config: nextConfig.IntelligentModels[0], ThresholdTokens: 600000 },
        true,
      )
      expect(session.rawData.modelContext.context?.context_key).toBe('new-key')
      expect(session.rawData.modelContext.pending).toBeUndefined()
    },
  )

  it('retries a failed Config save without restoring an unverified cached key', async () => {
    session.store.getState().updateState({ execute: false })
    session.rawData.modelContext.status = 'loading'
    setModel
      .mockRejectedValueOnce(new Error('save failed'))
      .mockResolvedValueOnce({ ...response, ContextKey: 'new-key' })
    submit({ threshold_tokens: 600000 })
    await vi.advanceTimersByTimeAsync(0)
    expect(session.rawData.modelContext.status).toBe('error')
    expect(submit(session.rawData.modelContext.failedPatch!)).toBe(true)
    await vi.advanceTimersByTimeAsync(0)
    expect(setModel).toHaveBeenLastCalledWith(
      {
        Config: useAIGlobalConfigStore.getState().persistedAiGlobalConfig?.IntelligentModels[0],
        ThresholdTokens: 600000,
      },
      true,
    )
    expect(session.rawData.modelContext.context?.context_key).toBe('new-key')
  })

  it('waits for settings to verify the model key before an online edit can be retried', async () => {
    session.rawData.modelContext.status = 'loading'
    expect(submit({ threshold_tokens: 600000 })).toBe(false)
    expect(session.rawData.modelContext).toMatchObject({
      error: 'AIContextUsage.missingContextKey',
      failedPatch: { threshold_tokens: 600000 },
    })
    expect(controller.handleSendMessage).not.toHaveBeenCalled()
    expect(setModel).not.toHaveBeenCalled()
    session.rawData.modelContext.status = 'ready'
    session.rawData.modelContext.saved = { ...saved, context_key: 'new-key' }
    expect(submit(session.rawData.modelContext.failedPatch!)).toBe(true)
    await vi.advanceTimersByTimeAsync(0)
    expect(controller.handleSendMessage).toHaveBeenCalledExactlyOnceWith({
      token: 'session-a',
      type: 'casual',
      params: {
        IsConfigHotpatch: true,
        HotpatchType: 'RuntimeContextSizeLimit',
        Params: { ModelContextKey: 'new-key', RuntimeContextSizeLimit: 600000 },
      },
      onSendError: expect.any(Function),
    })
  })

  it('uses the live runtime key for usage edits while the settings query is pending', async () => {
    session.rawData.modelContext.status = 'loading'
    const usage = renderHook(() => useSaveModelContext('stream'))
    expect(usage.result.current({ threshold_tokens: 600000 })).toBe(true)
    await vi.advanceTimersByTimeAsync(0)
    expect(controller.handleSendMessage).toHaveBeenCalledExactlyOnceWith({
      token: 'session-a',
      type: 'casual',
      params: {
        IsConfigHotpatch: true,
        HotpatchType: 'RuntimeContextSizeLimit',
        Params: { ModelContextKey: saved.context_key, RuntimeContextSizeLimit: 600000 },
      },
      onSendError: expect.any(Function),
    })
  })

  it.each(['loading', 'error', 'unsupported', 'unbound'] as const)(
    'keeps an old live event from confirming settings whose query is %s',
    async (status) => {
      session.rawData.modelContext.status = status
      push({ prompt_tokens: 200000 })
      expect(session.rawData.modelContext.status).toBe(status)
      expect(session.rawData.modelContext.runtime?.prompt_tokens).toBe(200000)
      expect(submit({ threshold_tokens: 600000 })).toBe(false)
      await vi.advanceTimersByTimeAsync(0)
      expect(controller.handleSendMessage).not.toHaveBeenCalled()
      expect(session.rawData.modelContext.failedPatch).toEqual({ threshold_tokens: 600000 })
    },
  )

  it('keeps an old live acknowledgement from confirming the model under settings lookup', async () => {
    session.rawData.modelContext.status = 'loading'
    const usage = renderHook(() => useSaveModelContext('stream'))
    usage.result.current({ threshold_tokens: 600000 })
    await vi.advanceTimersByTimeAsync(0)
    push({ threshold_tokens: 600000, change: { id: 'manual', reason: 'manual' } })
    expect(session.rawData.modelContext.pending).toBeUndefined()
    expect(session.rawData.modelContext.status).toBe('loading')
    expect(submit({ threshold_tokens: 700000 })).toBe(false)
  })

  it('keeps settings unverified after a usage edit fails during its lookup', async () => {
    session.rawData.modelContext.status = 'loading'
    vi.mocked(controller.handleSendMessage).mockImplementationOnce(({ onSendError }) => {
      queueMicrotask(() => onSendError?.(new Error('send failed')))
      return true
    })
    const usage = renderHook(() => useSaveModelContext('stream'))
    usage.result.current({ threshold_tokens: 600000 })
    await vi.advanceTimersByTimeAsync(0)
    expect(session.rawData.modelContext.status).toBe('loading')
    expect(submit({ threshold_tokens: 700000 })).toBe(false)
  })

  it('stops a save waiting for canonical config when its draft is discarded', async () => {
    session.store.getState().updateState({ execute: false })
    session.rawData.modelContext = { status: 'idle', generation: 0 }
    const config = useAIGlobalConfigStore.getState().persistedAiGlobalConfig!
    useAIGlobalConfigStore.setState({ persistedAiGlobalConfig: undefined })
    let finish!: (value: typeof config) => void
    vi.mocked(getCanonicalAIGlobalConfig).mockReturnValueOnce(
      new Promise<typeof config>((resolve) => {
        finish = resolve
      }),
    )
    submit({ threshold_tokens: 600000 })
    await vi.advanceTimersByTimeAsync(0)
    controller.discardUnsentDraft('session-a', 'test-page')
    const updates = session.store.getState().modelContextUpdate
    finish(config)
    await vi.advanceTimersByTimeAsync(0)
    expect(setModel).not.toHaveBeenCalled()
    expect(session.store.getState().modelContextUpdate).toBe(updates)
  })

  it('saves a queued edit after the first Set supplies the model key', async () => {
    session.store.getState().updateState({ execute: false })
    session.rawData.modelContext = { status: 'idle', generation: 0 }
    let finish!: (value: typeof response) => void
    setModel.mockReturnValueOnce(
      new Promise<typeof response>((resolve) => {
        finish = resolve
      }),
    )
    setModel.mockResolvedValueOnce({ ...response, DisableAutoAdjust: true })
    submit({ threshold_tokens: 600000 })
    submit({ disable_auto_adjust: true })
    await vi.advanceTimersByTimeAsync(0)
    expect(setModel).toHaveBeenCalledTimes(1)
    finish(response)
    await vi.advanceTimersByTimeAsync(0)
    expect(setModel).toHaveBeenCalledTimes(2)
    expect(setModel).toHaveBeenLastCalledWith(
      {
        Provider: saved.provider,
        Model: saved.model,
        ContextKey: saved.context_key,
        ThresholdTokens: 0,
        DisableAutoAdjust: true,
      },
      true,
    )
    expect(session.rawData.modelContext.context?.disable_auto_adjust).toBe(true)
  })

  it('keeps saving after the editor closes and updates only the initiating session', async () => {
    session.store.getState().updateState({ execute: false })
    push({ disable_auto_adjust: true })
    let finish!: (value: typeof response) => void
    setModel.mockReturnValueOnce(
      new Promise<typeof response>((resolve) => {
        finish = resolve
      }),
    )
    const editor = renderHook(() => useSaveModelContext('settings'))
    editor.result.current({ disable_auto_adjust: false })
    editor.unmount()
    controller.registerDraftSession('session-b', 'test-page')
    currentSession = controller.ensureSession('session-b')
    currentSessionId = 'session-b'
    await vi.advanceTimersByTimeAsync(0)
    finish(response)
    await vi.advanceTimersByTimeAsync(0)
    expect(setModel).toHaveBeenCalledExactlyOnceWith(
      {
        Provider: saved.provider,
        Model: saved.model,
        ContextKey: saved.context_key,
        ThresholdTokens: 0,
        DisableAutoAdjust: false,
      },
      true,
    )
    expect(session.rawData.modelContext.context?.disable_auto_adjust).toBe(false)
    expect(currentSession.rawData.modelContext.context).toBeUndefined()
  })

  it.each([NaN, 99999, 1000001, 100000.5])('rejects an invalid manual threshold %s', (tokens) => {
    expect(submit({ threshold_tokens: tokens })).toBe(false)
    expect(session.rawData.modelContext.pending).toBeUndefined()
  })

  it.each([{ ThresholdTokens: 'NaN' }, { ThresholdTokens: '0' }, { MinimumThresholdTokens: '-1' }])(
    'rolls back malformed Set results %j',
    async (invalid) => {
      session.store.getState().updateState({ execute: false })
      setModel.mockResolvedValueOnce({ ...response, ...invalid })
      submit({ threshold_tokens: 600000 })
      await vi.advanceTimersByTimeAsync(0)
      expect(session.rawData.modelContext).toMatchObject({
        context: { threshold_tokens: 500000 },
        error: 'Invalid model context token count',
        pending: undefined,
      })
    },
  )

  it('requires a live connection for usage edits even with saved settings', async () => {
    session.store.getState().updateState({ execute: false })
    const usage = renderHook(() => useSaveModelContext('stream'))
    expect(usage.result.current({ threshold_tokens: 600000 })).toBe(false)
    await vi.advanceTimersByTimeAsync(0)
    expect(setModel).not.toHaveBeenCalled()
    expect(controller.handleSendMessage).not.toHaveBeenCalled()
  })

  it('records missing-session feedback before attempting a save', async () => {
    currentSessionId = ''
    session.request.TimelineSessionID = ''
    const editor = renderHook(() => useSaveModelContext('settings'))
    expect(editor.result.current({ threshold_tokens: 600000 })).toBe(false)
    await vi.advanceTimersByTimeAsync(0)
    expect(session.rawData.modelContext).toMatchObject({
      error: 'AIContextUsage.sessionUnavailable',
      failedPatch: { threshold_tokens: 600000 },
    })
    expect(controller.handleSendMessage).not.toHaveBeenCalled()
    expect(setModel).not.toHaveBeenCalled()
  })

  it('records missing-key feedback when execution starts before a context arrives', async () => {
    session.rawData.modelContext = { status: 'idle', generation: 0 }
    expect(submit({ threshold_tokens: 600000 })).toBe(false)
    await vi.advanceTimersByTimeAsync(0)
    expect(session.rawData.modelContext).toMatchObject({
      error: 'AIContextUsage.missingContextKey',
      failedPatch: { threshold_tokens: 600000 },
    })
    expect(controller.handleSendMessage).not.toHaveBeenCalled()
    expect(setModel).not.toHaveBeenCalled()
  })

  it('requires a runtime key for usage edits and allows the settings key for settings edits', async () => {
    session.rawData.modelContext.runtime = undefined
    const usage = renderHook(() => useSaveModelContext('stream'))
    expect(usage.result.current({ threshold_tokens: 600000 })).toBe(false)
    expect(submit({ threshold_tokens: 600000 })).toBe(true)
    await vi.advanceTimersByTimeAsync(0)
    expect(controller.handleSendMessage).toHaveBeenCalledExactlyOnceWith({
      token: 'session-a',
      type: 'casual',
      params: {
        IsConfigHotpatch: true,
        HotpatchType: 'RuntimeContextSizeLimit',
        Params: { ModelContextKey: saved.context_key, RuntimeContextSizeLimit: 600000 },
      },
      onSendError: expect.any(Function),
    })
  })
})

import './setupElectron'
import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useSaveModelContext } from '@/pages/ai-agent/template/AIContextUsage/useSaveModelContext'
import useAIModelContext from '@/pages/ai-agent/useContext/useAIModelContext'
import { useAIGlobalConfigStore } from '@/store/aiGlobalConfig'
import { defaultAIGlobalConfig } from '@/pages/ai-agent/defaultConstant'
import type { AIModelContextResponse } from '@/pages/ai-agent/type/modelContext'
import type { ModelContextSnapshot } from '../aiRender'
import { getCanonicalAIGlobalConfig } from '../useAIGlobalConfig'
import { updateModelContextState } from '../modelContext'
import { globalSessionEngine } from '../ChatMultiSessionController'
import { grpcAIMessageHandlers } from '../grpcStreamHandler/grpcAIOutputEventHandlers'
import { makeGrpcJsonRes, makeHandlerRequest } from './fixtures'

const { getModel, setModel } = vi.hoisted(() => ({ getModel: vi.fn(), setModel: vi.fn() }))
vi.mock('../useAIGlobalConfig', () => ({ getCanonicalAIGlobalConfig: vi.fn() }))
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
  minimum_threshold_tokens: 100000,
  disable_auto_adjust: false,
}
const response = (overrides: Partial<AIModelContextResponse> = {}): AIModelContextResponse => ({
  Provider: saved.provider,
  Model: saved.model,
  ContextKey: saved.context_key,
  ThresholdTokens: saved.threshold_tokens,
  MinimumThresholdTokens: saved.minimum_threshold_tokens,
  DisableAutoAdjust: saved.disable_auto_adjust,
  Source: 'manual',
  ...overrides,
})
const identity = { Provider: saved.provider, Model: saved.model, ContextKey: saved.context_key }

describe('model context GET settings and session saves', () => {
  const controller = globalSessionEngine
  let session: ReturnType<typeof controller.ensureSession>
  let submit: ReturnType<typeof useSaveModelContext>
  const flush = () => act(async () => vi.advanceTimersByTimeAsync(0))
  const push = (data: Record<string, unknown> = {}, isSync = false) =>
    act(() => {
      grpcAIMessageHandlers.model_context(
        makeHandlerRequest({
          ...session,
          sessionId: 'session-a',
          res: makeGrpcJsonRes(
            'model_context',
            { prompt_tokens: 125000, ...data },
            {
              NodeId: 'model_context',
              IsSync: isSync,
            },
          ),
        }),
      )
    })

  beforeEach(() => {
    vi.useFakeTimers()
    getModel.mockReset().mockResolvedValue(response())
    setModel.mockReset().mockResolvedValue(response({ ThresholdTokens: 600000 }))
    const config = {
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
    }
    vi.mocked(getCanonicalAIGlobalConfig).mockReset().mockResolvedValue(config)
    useAIGlobalConfigStore.setState({ configSavePending: false, persistedAiGlobalConfig: config })
    controller.registerDraftSession('session-a', 'test-page')
    session = controller.ensureSession('session-a')
    session.rawData.modelContext = { status: 'ready', generation: 0, saved: { ...saved } }
    session.store.getState().updateState({ execute: true, initLoading: false })
    vi.spyOn(controller, 'handleSendMessage').mockReturnValue(true)
    currentSession = session
    currentSessionId = 'session-a'
    submit = renderHook(() => useSaveModelContext()).result.current
  })

  afterEach(() => {
    cleanup()
    controller.discardUnsentDraft('session-a', 'test-page')
    controller.discardUnsentDraft('session-b', 'test-page')
    vi.clearAllTimers()
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('takes only usage from events and preserves GET settings and key', () => {
    const baseline = session.rawData.modelContext.saved
    const before = session.store.getState().modelContextUpdate
    push({ context_key: 'event-key', threshold_tokens: 900000, minimum_threshold_tokens: 0, disable_auto_adjust: true })
    expect(session.rawData.modelContext.saved).toBe(baseline)
    expect(session.rawData.modelContext.promptTokens).toBe(125000)
    expect(session.store.getState().modelContextUpdate).toBe(before + 1)
  })

  it('keeps measured usage on a zero receipt and ignores history replay', () => {
    push()
    push({ prompt_tokens: 0 })
    push({ prompt_tokens: 400000 }, true)
    expect(session.rawData.modelContext.promptTokens).toBe(125000)
  })

  it.each([undefined, 125000])(
    'refreshes changed thresholds even when usage stays unchanged (%s)',
    async (promptTokens) => {
      push()
      const editor = renderHook(() => useAIModelContext('stream'))
      let finish!: (value: AIModelContextResponse) => void
      getModel.mockReturnValueOnce(
        new Promise((resolve) => {
          finish = resolve
        }),
      )
      const event = {
        context_key: saved.context_key,
        threshold_tokens: 450000,
        minimum_threshold_tokens: 0,
        disable_auto_adjust: true,
        prompt_tokens: promptTokens,
      }
      push(event)
      push(event)
      await flush()
      expect(getModel).toHaveBeenCalledOnce()
      expect(editor.result.current).toMatchObject({
        thresholdTokens: 500000,
        minimumThresholdTokens: 100000,
        editorDisableAutoAdjust: false,
        promptTokens: 125000,
      })
      finish(response({ ThresholdTokens: 440000, MinimumThresholdTokens: 75000, DisableAutoAdjust: false }))
      await flush()
      expect(editor.result.current).toMatchObject({
        thresholdTokens: 440000,
        minimumThresholdTokens: 75000,
        editorDisableAutoAdjust: false,
        promptTokens: 125000,
      })
      push({ ...event, threshold_tokens: 440000 })
      await flush()
      expect(getModel).toHaveBeenCalledOnce()
    },
  )

  it('ignores unchanged, invalid, historical and other-model thresholds', async () => {
    push()
    renderHook(() => useAIModelContext('stream'))
    for (const threshold_tokens of [saved.threshold_tokens, undefined, null, 0, -1, 1.5, '450000']) {
      push({ context_key: saved.context_key, threshold_tokens })
    }
    push({ context_key: 'other-model', threshold_tokens: 450000 })
    push({ context_key: saved.context_key, threshold_tokens: 450000 }, true)
    await flush()
    expect(getModel).not.toHaveBeenCalled()
    expect(session.rawData.modelContext.saved).toEqual(saved)
  })

  it('reads again when the threshold changes during an in-flight GET', async () => {
    push()
    const editor = renderHook(() => useAIModelContext('stream'))
    let finish!: (value: AIModelContextResponse) => void
    getModel
      .mockReturnValueOnce(
        new Promise((resolve) => {
          finish = resolve
        }),
      )
      .mockResolvedValue(response({ ThresholdTokens: 400000 }))
    push({ context_key: saved.context_key, threshold_tokens: 450000 })
    await flush()
    expect(getModel).toHaveBeenCalledOnce()
    push({ context_key: saved.context_key, threshold_tokens: 400000 })
    push({ context_key: saved.context_key, threshold_tokens: 400000 })
    expect(getModel).toHaveBeenCalledOnce()
    finish(response({ ThresholdTokens: 450000 }))
    await flush()
    expect(getModel).toHaveBeenCalledTimes(2)
    expect(editor.result.current.thresholdTokens).toBe(400000)
  })

  it.each(['settings', 'stream'] as const)('uses the GET key for the %s entry point', async (source) => {
    push({ context_key: 'event-key', threshold_tokens: 800000, disable_auto_adjust: true })
    getModel.mockResolvedValue(response({ ThresholdTokens: 600000 }))
    const editor = renderHook(() => useAIModelContext(source))
    act(() => {
      editor.result.current.save({ threshold_tokens: 600000 })
    })
    await flush()
    expect(controller.handleSendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        token: 'session-a',
        params: {
          IsConfigHotpatch: true,
          HotpatchType: 'RuntimeContextSizeLimit',
          Params: { ModelContextKey: saved.context_key, RuntimeContextSizeLimit: 600000 },
        },
      }),
    )
    expect(getModel).toHaveBeenCalledWith(identity, true)
    expect(setModel).not.toHaveBeenCalled()
    expect(session.rawData.modelContext.saved?.threshold_tokens).toBe(600000)
    expect(session.rawData.modelContext.pending).toBeUndefined()
  })

  it('waits for GET to confirm a hotpatch even when a stream receipt claims success', async () => {
    submit({ threshold_tokens: 600000 })
    await flush()
    push({ threshold_tokens: 600000, change: { id: 'manual', reason: 'manual' }, pending: false, error: '' })
    expect(session.rawData.modelContext.pending).toBeDefined()
    expect(session.rawData.modelContext.saved?.threshold_tokens).toBe(500000)
    getModel.mockResolvedValue(response({ ThresholdTokens: 600000 }))
    await act(async () => vi.advanceTimersByTimeAsync(300))
    expect(session.rawData.modelContext.pending).toBeUndefined()
    expect(session.rawData.modelContext.saved?.threshold_tokens).toBe(600000)
    const reads = getModel.mock.calls.length
    await act(async () => vi.advanceTimersByTimeAsync(1000))
    expect(getModel).toHaveBeenCalledTimes(reads)
  })

  it('requires both edited fields to match the GET result', async () => {
    getModel.mockResolvedValue(response({ ThresholdTokens: 600000 }))
    submit({ threshold_tokens: 600000, disable_auto_adjust: true })
    await flush()
    expect(session.rawData.modelContext.pending).toBeDefined()
    getModel.mockResolvedValue(response({ ThresholdTokens: 600000, DisableAutoAdjust: true }))
    await act(async () => vi.advanceTimersByTimeAsync(300))
    expect(session.rawData.modelContext.pending).toBeUndefined()
    expect(session.rawData.modelContext.saved).toMatchObject({ threshold_tokens: 600000, disable_auto_adjust: true })
  })

  it('shows the engine rejection immediately and ignores a late GET until retry', async () => {
    let finish!: (value: AIModelContextResponse) => void
    getModel.mockReturnValueOnce(
      new Promise((resolve) => {
        finish = resolve
      }),
    )
    push({ prompt_tokens: 42000 })
    const editor = renderHook(() => useAIModelContext('stream'))
    const patch = { threshold_tokens: 600000 }
    act(() => {
      editor.result.current.save(patch)
    })
    await flush()
    push({
      context_key: saved.context_key,
      error: '引擎拒绝了阈值',
      prompt_tokens: undefined,
      threshold_tokens: 900000,
    })
    expect(editor.result.current).toMatchObject({
      error: '引擎拒绝了阈值',
      editorThresholdTokens: saved.threshold_tokens,
      promptTokens: 42000,
    })
    expect(session.rawData.modelContext).toMatchObject({ pending: undefined, failedPatch: patch, saved })
    finish(response({ ThresholdTokens: 600000 }))
    await act(async () => vi.advanceTimersByTimeAsync(10000))
    expect(editor.result.current.error).toBe('引擎拒绝了阈值')
    expect(getModel).toHaveBeenCalledOnce()
    getModel.mockResolvedValue(response({ ThresholdTokens: 600000 }))
    act(() => editor.result.current.retry())
    await flush()
    expect(editor.result.current.error).toBeUndefined()
    expect(editor.result.current.thresholdTokens).toBe(600000)
  })

  it('only applies live errors for the model whose hotpatch has been sent', async () => {
    const rejection = { context_key: saved.context_key, error: 'rejected' }
    submit({ threshold_tokens: 600000 })
    push(rejection)
    await flush()
    push(rejection, true)
    push({ ...rejection, context_key: 'other-model' })
    push({ ...rejection, error: '   ' })
    expect(session.rawData.modelContext.pending).toBeDefined()
    expect(session.rawData.modelContext.error).toBeUndefined()
    push({ ...rejection, prompt_tokens: 35000 })
    expect(session.rawData.modelContext).toMatchObject({ error: 'rejected', promptTokens: 35000, pending: undefined })
  })

  it('preserves false and automatic thresholds below the manual floor', async () => {
    session.rawData.modelContext.saved = { ...saved, threshold_tokens: 80000, disable_auto_adjust: true }
    getModel.mockResolvedValue(response({ ThresholdTokens: 80000, DisableAutoAdjust: false }))
    submit({ disable_auto_adjust: false })
    await flush()
    expect(controller.handleSendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        params: expect.objectContaining({
          Params: {
            ModelContextKey: saved.context_key,
            RuntimeContextSizeLimit: 0,
            DisableContextAutoAdjust: false,
          },
        }),
      }),
    )
    expect(session.rawData.modelContext.saved).toMatchObject({ threshold_tokens: 80000, disable_auto_adjust: false })
    expect(session.rawData.modelContext.pending).toBeUndefined()
  })

  it('retains the GET snapshot after asynchronous send rejection', async () => {
    vi.mocked(controller.handleSendMessage).mockImplementationOnce(({ onSendError }) => {
      queueMicrotask(() => onSendError?.(new Error('offline')))
      return true
    })
    submit({ threshold_tokens: 600000 })
    await flush()
    expect(session.rawData.modelContext).toMatchObject({
      saved,
      error: 'offline',
      failedPatch: { threshold_tokens: 600000 },
      pending: undefined,
    })
  })

  it('reports a channel rejection using the initiating session ID', async () => {
    currentSessionId = 'other-visible-session'
    session.request.TimelineSessionID = 'session-a'
    vi.mocked(controller.handleSendMessage).mockReturnValueOnce(false)
    renderHook(() => useSaveModelContext()).result.current({ threshold_tokens: 600000 })
    await flush()
    expect(controller.handleSendMessage).toHaveBeenCalledWith(expect.objectContaining({ token: 'session-a' }))
    expect(session.rawData.modelContext).toMatchObject({
      failedPatch: { threshold_tokens: 600000 },
      error: 'AIContextUsage.sessionUnavailable',
      pending: undefined,
    })
  })

  it('keeps a failed GET readback available for retry across usage events', async () => {
    getModel.mockRejectedValueOnce(new Error('query failed'))
    submit({ threshold_tokens: 600000 })
    await flush()
    push({ error: 'event error', threshold_tokens: 900000 })
    expect(session.rawData.modelContext).toMatchObject({
      saved,
      error: 'query failed',
      failedPatch: { threshold_tokens: 600000 },
      pending: undefined,
    })
    getModel.mockResolvedValue(response({ ThresholdTokens: 600000 }))
    submit(session.rawData.modelContext.failedPatch!)
    await flush()
    expect(session.rawData.modelContext.error).toBeUndefined()
    expect(session.rawData.modelContext.failedPatch).toBeUndefined()
    expect(session.rawData.modelContext.saved?.threshold_tokens).toBe(600000)
  })

  it('times out after ten seconds and stops polling', async () => {
    submit({ threshold_tokens: 600000 })
    await act(async () => vi.advanceTimersByTimeAsync(9999))
    expect(session.rawData.modelContext.pending).toBeDefined()
    await act(async () => vi.advanceTimersByTimeAsync(1))
    expect(session.rawData.modelContext).toMatchObject({
      saved,
      error: 'AIContextUsage.saveTimeout',
      pending: undefined,
    })
    const reads = getModel.mock.calls.length
    await act(async () => vi.advanceTimersByTimeAsync(1000))
    expect(getModel).toHaveBeenCalledTimes(reads)
  })

  it('does not send unchanged values or invalid manual thresholds', async () => {
    for (const threshold_tokens of [500000, NaN, 99999, 1000001, 100000.5]) {
      expect(submit({ threshold_tokens })).toBe(false)
    }
    expect(submit({ disable_auto_adjust: false })).toBe(false)
    await flush()
    expect(controller.handleSendMessage).not.toHaveBeenCalled()
    expect(setModel).not.toHaveBeenCalled()
  })

  it('reads Config before a hotpatch when the GET key is unavailable', async () => {
    session.rawData.modelContext = { status: 'idle', generation: 0 }
    getModel
      .mockResolvedValueOnce(response({ ContextKey: 'get-key' }))
      .mockResolvedValue(response({ ContextKey: 'get-key', ThresholdTokens: 600000 }))
    submit({ threshold_tokens: 600000 })
    await flush()
    expect(getModel).toHaveBeenNthCalledWith(
      1,
      {
        Config: useAIGlobalConfigStore.getState().persistedAiGlobalConfig?.IntelligentModels[0],
      },
      true,
    )
    expect(controller.handleSendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        params: expect.objectContaining({ Params: { ModelContextKey: 'get-key', RuntimeContextSizeLimit: 600000 } }),
      }),
    )
    expect(session.rawData.modelContext.saved?.context_key).toBe('get-key')
  })

  it('rejects a GET result without a key before sending a hotpatch', async () => {
    session.rawData.modelContext = { status: 'idle', generation: 0 }
    getModel.mockResolvedValue(response({ ContextKey: '' }))
    submit({ threshold_tokens: 600000 })
    await flush()
    expect(controller.handleSendMessage).not.toHaveBeenCalled()
    expect(session.rawData.modelContext).toMatchObject({
      error: 'AIContextUsage.missingContextKey',
      failedPatch: { threshold_tokens: 600000 },
      pending: undefined,
    })
  })

  it('validates the minimum returned by GET before sending an edit made during loading', async () => {
    session.rawData.modelContext = { status: 'loading', generation: 0 }
    getModel.mockResolvedValue(response({ MinimumThresholdTokens: 700000 }))
    submit({ threshold_tokens: 600000 })
    await flush()
    expect(controller.handleSendMessage).not.toHaveBeenCalled()
    expect(session.rawData.modelContext.pending).toBeUndefined()
    expect(session.rawData.modelContext.saved?.minimum_threshold_tokens).toBe(700000)
    expect(session.rawData.modelContext.failedPatch).toEqual({ threshold_tokens: 600000 })
  })

  it('allows an edit below the default floor when GET returns a lower minimum during loading', async () => {
    session.rawData.modelContext = { status: 'loading', generation: 0 }
    getModel
      .mockResolvedValueOnce(response({ MinimumThresholdTokens: 75000 }))
      .mockResolvedValue(response({ ThresholdTokens: 80000, MinimumThresholdTokens: 75000 }))
    expect(submit({ threshold_tokens: 80000 })).toBe(true)
    await flush()
    expect(controller.handleSendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        params: expect.objectContaining({
          Params: { ModelContextKey: saved.context_key, RuntimeContextSizeLimit: 80000 },
        }),
      }),
    )
    expect(session.rawData.modelContext.saved).toMatchObject({
      threshold_tokens: 80000,
      minimum_threshold_tokens: 75000,
    })
    expect(session.rawData.modelContext.pending).toBeUndefined()
  })

  it('uses SET outside a session and displays the subsequent GET result', async () => {
    session.store.getState().updateState({ execute: false })
    setModel.mockResolvedValue(response({ ContextKey: 'set-key', ThresholdTokens: 900000, DisableAutoAdjust: true }))
    getModel.mockResolvedValue(response({ ThresholdTokens: '640000', MinimumThresholdTokens: '75000' }))
    submit({ threshold_tokens: 640000 })
    await flush()
    expect(setModel).toHaveBeenCalledExactlyOnceWith({ ...identity, ThresholdTokens: 640000 }, true)
    expect(getModel).toHaveBeenCalledExactlyOnceWith(identity, true)
    expect(controller.handleSendMessage).not.toHaveBeenCalled()
    expect(session.rawData.modelContext.saved).toMatchObject({
      context_key: saved.context_key,
      threshold_tokens: 640000,
      minimum_threshold_tokens: 75000,
      disable_auto_adjust: false,
    })
  })

  it.each(['loading', 'error'] as const)('uses current Config while cached settings are %s', async (status) => {
    session.store.getState().updateState({ execute: false })
    session.rawData.modelContext.status = status
    const config = useAIGlobalConfigStore.getState().persistedAiGlobalConfig!
    const target = { ...config.IntelligentModels[0], ContextOwnerId: 'new-owner' }
    useAIGlobalConfigStore.setState({ persistedAiGlobalConfig: { ...config, IntelligentModels: [target] } })
    getModel.mockResolvedValue(response({ ContextKey: 'new-key', ThresholdTokens: 600000 }))
    submit({ threshold_tokens: 600000 })
    await flush()
    expect(setModel).toHaveBeenCalledExactlyOnceWith({ Config: target, ThresholdTokens: 600000 }, true)
    expect(getModel).toHaveBeenCalledWith({ Config: target }, true)
    expect(session.rawData.modelContext.saved?.context_key).toBe('new-key')
  })

  it('allows offline SET without a session ID', async () => {
    session.store.getState().updateState({ execute: false })
    currentSessionId = ''
    session.request.TimelineSessionID = ''
    getModel.mockResolvedValue(response({ ThresholdTokens: 600000 }))
    expect(renderHook(() => useSaveModelContext()).result.current({ threshold_tokens: 600000 })).toBe(true)
    await flush()
    expect(setModel).toHaveBeenCalledTimes(1)
    expect(session.rawData.modelContext.pending).toBeUndefined()
  })

  it('retries a failed Config save without trusting a previous model key', async () => {
    session.store.getState().updateState({ execute: false })
    session.rawData.modelContext.status = 'loading'
    const config = useAIGlobalConfigStore.getState().persistedAiGlobalConfig!
    const target = { ...config.IntelligentModels[0], ContextOwnerId: 'new-owner' }
    useAIGlobalConfigStore.setState({ persistedAiGlobalConfig: { ...config, IntelligentModels: [target] } })
    setModel.mockRejectedValueOnce(new Error('save failed'))
    getModel.mockResolvedValue(response({ ContextKey: 'new-key', ThresholdTokens: 600000 }))
    submit({ threshold_tokens: 600000 })
    await flush()
    submit(session.rawData.modelContext.failedPatch!)
    await flush()
    expect(setModel).toHaveBeenLastCalledWith({ Config: target, ThresholdTokens: 600000 }, true)
    expect(session.rawData.modelContext.saved?.context_key).toBe('new-key')
  })

  it('saves queued offline edits using the key supplied by GET', async () => {
    session.store.getState().updateState({ execute: false })
    session.rawData.modelContext = { status: 'idle', generation: 0 }
    let finish!: (value: AIModelContextResponse) => void
    setModel.mockReturnValueOnce(
      new Promise((resolve) => {
        finish = resolve
      }),
    )
    getModel
      .mockResolvedValueOnce(response({ ThresholdTokens: 600000 }))
      .mockResolvedValue(response({ ThresholdTokens: 600000, DisableAutoAdjust: true }))
    submit({ threshold_tokens: 600000 })
    submit({ disable_auto_adjust: true })
    await flush()
    expect(setModel).toHaveBeenCalledTimes(1)
    finish(response({ ContextKey: 'untrusted-set-key' }))
    await flush()
    expect(setModel).toHaveBeenCalledTimes(2)
    expect(setModel).toHaveBeenLastCalledWith({ ...identity, ThresholdTokens: 0, DisableAutoAdjust: true }, true)
    expect(session.rawData.modelContext.saved?.disable_auto_adjust).toBe(true)
  })

  it('rejects a GET readback for a different model identity', async () => {
    getModel.mockResolvedValue(response({ ContextKey: 'other-key', ThresholdTokens: 600000 }))
    submit({ threshold_tokens: 600000 })
    await flush()
    expect(session.rawData.modelContext).toMatchObject({
      saved,
      error: 'AIContextUsage.loadFailed',
      failedPatch: { threshold_tokens: 600000 },
      pending: undefined,
    })
  })

  it('reports a missing session ID for a live edit', async () => {
    currentSessionId = ''
    session.request.TimelineSessionID = ''
    expect(renderHook(() => useSaveModelContext()).result.current({ threshold_tokens: 600000 })).toBe(false)
    await flush()
    expect(controller.handleSendMessage).not.toHaveBeenCalled()
    expect(session.rawData.modelContext.error).toBe('AIContextUsage.sessionUnavailable')
  })

  it.each([{ persistedAiGlobalConfig: undefined }, { configSavePending: true }])(
    'discards a save waiting for confirmed config (%o) when its draft closes',
    async (configState) => {
      session.store.getState().updateState({ execute: false })
      session.rawData.modelContext = { status: 'idle', generation: 0 }
      const config = useAIGlobalConfigStore.getState().persistedAiGlobalConfig!
      useAIGlobalConfigStore.setState(configState)
      let finish!: (value: typeof config) => void
      vi.mocked(getCanonicalAIGlobalConfig).mockReturnValueOnce(
        new Promise((resolve) => {
          finish = resolve
        }),
      )
      submit({ threshold_tokens: 600000 })
      await flush()
      expect(getCanonicalAIGlobalConfig).toHaveBeenCalledOnce()
      controller.discardUnsentDraft('session-a', 'test-page')
      const updates = session.store.getState().modelContextUpdate
      finish(config)
      await flush()
      expect(setModel).not.toHaveBeenCalled()
      expect(session.store.getState().modelContextUpdate).toBe(updates)
    },
  )

  it('merges queued edits and submits them after the first GET confirmation', async () => {
    let finish!: (value: AIModelContextResponse) => void
    getModel
      .mockReturnValueOnce(
        new Promise((resolve) => {
          finish = resolve
        }),
      )
      .mockResolvedValue(response({ ThresholdTokens: 800000, DisableAutoAdjust: true }))
    submit({ threshold_tokens: 600000 })
    submit({ threshold_tokens: 700000 })
    submit({ disable_auto_adjust: true })
    submit({ threshold_tokens: 800000 })
    await flush()
    expect(controller.handleSendMessage).toHaveBeenCalledTimes(1)
    finish(response({ ThresholdTokens: 600000 }))
    await flush()
    expect(controller.handleSendMessage).toHaveBeenCalledTimes(2)
    expect(controller.handleSendMessage).toHaveBeenLastCalledWith(
      expect.objectContaining({
        params: expect.objectContaining({
          Params: {
            ModelContextKey: saved.context_key,
            RuntimeContextSizeLimit: 800000,
            DisableContextAutoAdjust: true,
          },
        }),
      }),
    )
    expect(session.rawData.modelContext.pending).toBeUndefined()
    expect(session.rawData.modelContext.saved?.threshold_tokens).toBe(800000)
  })

  it.each(['error', 'timeout', 'stream rejection'])('submits queued edits once after %s', async (outcome) => {
    if (outcome === 'error') getModel.mockRejectedValueOnce(new Error('read failed'))
    else getModel.mockReturnValueOnce(new Promise(() => {}))
    getModel.mockResolvedValue(response({ ThresholdTokens: 700000 }))
    submit({ threshold_tokens: 600000 })
    submit({ threshold_tokens: 700000 })
    await flush()
    if (outcome === 'timeout') await act(async () => vi.advanceTimersByTimeAsync(10000))
    if (outcome === 'stream rejection') {
      push({ context_key: saved.context_key, error: 'rejected' })
      await flush()
    }
    expect(controller.handleSendMessage).toHaveBeenCalledTimes(2)
    expect(session.rawData.modelContext.saved?.threshold_tokens).toBe(700000)
    expect(session.rawData.modelContext.pending).toBeUndefined()
    await act(async () => vi.advanceTimersByTimeAsync(10000))
    expect(controller.handleSendMessage).toHaveBeenCalledTimes(2)
  })

  it('continues a save after the editor closes and updates only its initiating session', async () => {
    session.store.getState().updateState({ execute: false })
    let finish!: (value: AIModelContextResponse) => void
    setModel.mockReturnValueOnce(
      new Promise((resolve) => {
        finish = resolve
      }),
    )
    getModel.mockResolvedValue(response({ ThresholdTokens: 600000 }))
    const editor = renderHook(() => useSaveModelContext())
    editor.result.current({ threshold_tokens: 600000 })
    editor.unmount()
    controller.registerDraftSession('session-b', 'test-page')
    currentSession = controller.ensureSession('session-b')
    currentSessionId = 'session-b'
    await flush()
    finish(response({ ThresholdTokens: 600000 }))
    await flush()
    expect(session.rawData.modelContext.saved?.threshold_tokens).toBe(600000)
    expect(currentSession.rawData.modelContext.saved).toBeUndefined()
  })

  it.each(['resolve', 'reject'] as const)('ignores a late GET %s after model reset', async (outcome) => {
    let finish!: () => void
    getModel.mockReturnValueOnce(
      new Promise((resolve, reject) => {
        finish = () => {
          if (outcome === 'resolve') resolve(response({ ThresholdTokens: 600000 }))
          else reject(new Error('stale lookup'))
        }
      }),
    )
    submit({ threshold_tokens: 600000 })
    submit({ disable_auto_adjust: true })
    await flush()
    updateModelContextState(session, { generation: 10, pending: undefined, saved: undefined, status: 'idle' })
    const nextState = session.rawData.modelContext
    finish()
    await flush()
    expect(session.rawData.modelContext).toBe(nextState)
    expect(controller.handleSendMessage).toHaveBeenCalledTimes(1)
  })

  it.each([{ ThresholdTokens: 'NaN' }, { ThresholdTokens: '0' }, { MinimumThresholdTokens: '-1' }])(
    'retains settings when GET returns malformed token counts %j',
    async (invalid) => {
      session.store.getState().updateState({ execute: false })
      getModel.mockResolvedValue(response(invalid))
      submit({ threshold_tokens: 600000 })
      await flush()
      expect(session.rawData.modelContext).toMatchObject({
        saved,
        error: 'Invalid model context token count',
        pending: undefined,
      })
    },
  )
})

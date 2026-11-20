import './setupElectron'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defaultAIGlobalConfig } from '@/pages/ai-agent/defaultConstant'
import { useAIGlobalConfigStore } from '@/store/aiGlobalConfig'
import { ChatMultiSessionController } from '../ChatMultiSessionController'
import { makeGrpcJsonRes } from './fixtures'

describe('controller session model context', () => {
  let controller: ChatMultiSessionController
  let owner: ReturnType<ChatMultiSessionController['ensureSession']>
  beforeEach(() => {
    vi.resetAllMocks()
    controller = new ChatMultiSessionController()
    controller.registerDraftSession('session-a', 'test-page')
    owner = controller.ensureSession('session-a')
  })

  afterEach(() => {
    controller.discardUnsentDraft('session-a', 'test-page')
  })

  it('publishes valid model context and skips malformed, unrelated and historical events', async () => {
    const context = {
      provider: 'openai',
      model: 'model',
      context_key: 'owner:model',
      threshold_tokens: 500000,
      prompt_tokens: 125000,
      source: 'default' as const,
      pending: false,
      disable_auto_adjust: false,
    }
    const res = makeGrpcJsonRes('model_context', context, { NodeId: 'model_context' })
    owner.store.getState().updateState({ execute: true })
    const before = owner.store.getState().modelContextUpdate
    await controller['processGrpcOutputEvent']('session-a', res, owner.meta)
    expect(owner.store.getState().modelContextUpdate).toBe(before + 1)
    expect(owner.rawData.modelContext).toEqual({ status: 'idle', generation: 0, promptTokens: 125000 })
    for (const override of [
      { NodeId: 'other' },
      { IsSync: true },
      { Content: new TextEncoder().encode('{broken') },
      { Type: 'pressure' },
    ]) {
      await controller['processGrpcOutputEvent']('session-a', { ...res, ...override }, owner.meta)
    }
    expect(owner.rawData.modelContext.promptTokens).toBe(125000)
    expect(owner.store.getState().modelContextUpdate).toBe(before + 1)
  })

  it('keeps session snapshots when global model settings change', () => {
    const snapshot = { ...owner.rawData.modelContext, generation: 3, promptTokens: 125000 }
    owner.rawData.modelContext = snapshot
    const before = owner.store.getState().modelContextUpdate
    useAIGlobalConfigStore.setState({
      persistedAiGlobalConfig: {
        ...defaultAIGlobalConfig,
        IntelligentModels: [{ ModelName: 'other', ProviderId: '0', Provider: { Type: 'openai' }, ExtraParams: [] }],
      },
    })
    expect(owner.rawData.modelContext).toBe(snapshot)
    expect(owner.store.getState().modelContextUpdate).toBe(before)
  })

  it.each(['error', 'unsupported'] as const)(
    'retains a failed settings query during live usage updates (%s)',
    async (status) => {
      owner.rawData.modelContext = { status, generation: 1, error: 'query failed' }
      const context = {
        provider: 'openai',
        model: 'model',
        context_key: 'owner:model',
        threshold_tokens: 500000,
        prompt_tokens: 125000,
        source: 'default',
        pending: false,
        disable_auto_adjust: false,
      }
      await controller['processGrpcOutputEvent'](
        'session-a',
        makeGrpcJsonRes('model_context', context, { NodeId: 'model_context' }),
        owner.meta,
      )
      expect(owner.rawData.modelContext).toMatchObject({
        status,
        error: 'query failed',
        promptTokens: 125000,
      })
    },
  )

  it.each([{}, null, { prompt_tokens: -1 }, { prompt_tokens: 1.5 }, { prompt_tokens: '100' }])(
    'ignores invalid usage and accepts a following usage-only event (%j)',
    async (empty) => {
      const before = owner.rawData.modelContext
      const updates = owner.store.getState().modelContextUpdate
      await controller['processGrpcOutputEvent'](
        'session-a',
        makeGrpcJsonRes('model_context', empty, { NodeId: 'model_context' }),
        owner.meta,
      )
      expect(owner.rawData.modelContext).toBe(before)
      expect(owner.store.getState().modelContextUpdate).toBe(updates)

      const context = { prompt_tokens: 125000 }
      await controller['processGrpcOutputEvent'](
        'session-a',
        makeGrpcJsonRes('model_context', context, { NodeId: 'model_context' }),
        owner.meta,
      )
      expect(owner.rawData.modelContext).toMatchObject({
        status: 'idle',
        promptTokens: 125000,
      })
      expect(owner.store.getState().modelContextUpdate).toBe(updates + 1)
    },
  )

  it('preserves queried settings and pending saves regardless of event metadata', async () => {
    const saved = {
      provider: 'openai',
      model: 'model',
      context_key: 'get-key',
      threshold_tokens: 500000,
      minimum_threshold_tokens: 100000,
      disable_auto_adjust: false,
    }
    const pending = { patch: { threshold_tokens: 600000 }, baseline: saved }
    owner.rawData.modelContext = { status: 'ready', generation: 1, saved, pending }
    await controller['processGrpcOutputEvent'](
      'session-a',
      makeGrpcJsonRes(
        'model_context',
        {
          ...saved,
          context_key: 'event-key',
          threshold_tokens: 600000,
          disable_auto_adjust: true,
          prompt_tokens: 125000,
          change: { id: 'change-1', reason: 'manual' },
          error: 'event error',
        },
        { NodeId: 'model_context' },
      ),
      owner.meta,
    )
    expect(owner.rawData.modelContext).toEqual({
      status: 'ready',
      generation: 1,
      saved,
      pending,
      promptTokens: 125000,
    })
  })

  it('accepts initial zero usage and retains measured usage for zero-value receipts', async () => {
    for (const [promptTokens, expected] of [
      [0, 0],
      [125000, 125000],
      [0, 125000],
    ]) {
      await controller['processGrpcOutputEvent'](
        'session-a',
        makeGrpcJsonRes('model_context', { prompt_tokens: promptTokens }, { NodeId: 'model_context' }),
        owner.meta,
      )
      expect(owner.rawData.modelContext.promptTokens).toBe(expected)
    }
  })
})

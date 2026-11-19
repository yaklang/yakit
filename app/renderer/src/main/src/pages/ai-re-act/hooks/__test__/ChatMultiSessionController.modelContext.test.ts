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
    expect(owner.rawData.modelContext.context?.threshold_tokens).toBe(500000)
    expect(owner.rawData.modelContext.runtime?.prompt_tokens).toBe(125000)
    for (const override of [
      { NodeId: 'other' },
      { IsSync: true },
      { Content: new TextEncoder().encode('{broken') },
      { Type: 'pressure' },
    ]) {
      await controller['processGrpcOutputEvent']('session-a', { ...res, ...override }, owner.meta)
    }
    expect(owner.rawData.modelContext.runtime?.prompt_tokens).toBe(125000)
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
})

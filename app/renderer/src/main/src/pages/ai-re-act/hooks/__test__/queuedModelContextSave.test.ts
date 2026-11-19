import './setupElectron'
import { describe, expect, it, vi } from 'vitest'
import type { ModelContextSnapshot } from '../aiRender'
import { enqueueModelContextSave, updateModelContextState } from '../modelContext'
import { createTestSession } from './fixtures'

const baseline: ModelContextSnapshot = {
  context_key: 'key-a',
  provider: 'openai',
  model: 'primary',
  source: 'default',
  pending: false,
  threshold_tokens: 500000,
  disable_auto_adjust: false,
}

const setupPending = () => {
  const session = createTestSession()
  updateModelContextState(session, {
    context: baseline,
    pending: { baseline, patch: { threshold_tokens: 600000 } },
  })
  return session
}

describe('queued model context edits', () => {
  it('combines subsequent edits once, using the latest value for each field', () => {
    const session = setupPending()
    const submit = vi.fn()
    enqueueModelContextSave(session, { threshold_tokens: 700000 }, submit)
    enqueueModelContextSave(session, { disable_auto_adjust: false }, submit)
    enqueueModelContextSave(session, { threshold_tokens: 800000 }, submit)
    expect(session.rawData.modelContext.pending?.queuedPatch).toEqual({
      threshold_tokens: 800000,
      disable_auto_adjust: false,
    })
    updateModelContextState(session, { promptTokens: 300 })
    expect(submit).not.toHaveBeenCalled()
    updateModelContextState(session, { pending: undefined })
    updateModelContextState(session, { promptTokens: 400 })
    expect(submit).toHaveBeenCalledExactlyOnceWith({ threshold_tokens: 800000, disable_auto_adjust: false })
  })

  it.each([{ generation: 1 }, { context: { ...baseline, context_key: 'key-b' } }])(
    'discards queued edits when the original session generation or model changes',
    (replacement) => {
      const session = setupPending()
      const submit = vi.fn()
      enqueueModelContextSave(session, { threshold_tokens: 700000 }, submit)
      updateModelContextState(session, { pending: undefined, ...replacement })
      expect(submit).not.toHaveBeenCalled()
    },
  )
})

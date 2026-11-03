import { describe, expect, it } from 'vitest'
import { mergeAISessionUpdates } from '../sessionUpdates'
import type { AISession } from '../../type/aiChat'

describe('partial hotpatch updates in session history', () => {
  it('merges partial strategy updates without losing Multi-Agent or unrelated Goal fields', () => {
    const session = {
      SessionID: 'session-a',
      StartParams: {
        ForgeName: 'employee',
        Strategy: { EnableMultiAgent: true, MaxSubAgents: 7, EnableGoalMode: true, GoalDurationSeconds: 600 },
      },
    } as AISession
    const updated = mergeAISessionUpdates(session, {
      StartParams: { Strategy: { GoalDurationSeconds: 0, GoalAcceptanceCriteria: 'report' } },
    })
    expect(updated.StartParams?.Strategy).toEqual({
      EnableMultiAgent: true,
      MaxSubAgents: 7,
      EnableGoalMode: true,
      GoalDurationSeconds: 0,
      GoalAcceptanceCriteria: 'report',
    })
    expect(updated.StartParams?.ForgeName).toBe('employee')
    expect(session.StartParams?.Strategy?.GoalDurationSeconds).toBe(600)
  })
  it('merges sequential patches without losing Forge, strategy, or attachments', () => {
    const session = {
      SessionID: 'session-a',
      Title: 'Employee session',
      StartParams: {
        RuntimeContextSizeLimit: 122880,
        ForgeName: 'employee-forge',
        EnablePlan: true,
        Strategy: { EnableGoalMode: false },
        AttachedResourceInfo: [{ Type: 'file', Value: 'example.txt' }],
      },
    } as unknown as AISession
    const originalParams = session.StartParams
    const first = mergeAISessionUpdates(session, { StartParams: { RuntimeContextSizeLimit: 614400 } })
    const second = mergeAISessionUpdates(first, { StartParams: { SyncPerceptionTrigger: true } })
    expect(second.StartParams).toEqual({
      ...originalParams,
      RuntimeContextSizeLimit: 614400,
      SyncPerceptionTrigger: true,
    })
    expect(session.StartParams).toBe(originalParams)
    expect(session.StartParams?.RuntimeContextSizeLimit).toBe(122880)
    expect(first.StartParams?.SyncPerceptionTrigger).toBeUndefined()
  })

  it('updates ordinary session fields while retaining the startup-parameter object', () => {
    const session = { SessionID: 'session-a', Title: 'Before', StartParams: { ForgeName: 'employee' } } as AISession
    const updated = mergeAISessionUpdates(session, { Title: 'After' })
    expect(updated.Title).toBe('After')
    expect(updated.StartParams).toBe(session.StartParams)
  })

  it('handles old history without StartParams', () => {
    const session = { SessionID: 'old-session' } as AISession
    expect(mergeAISessionUpdates(session, { StartParams: { RuntimeContextSizeLimit: 614400 } }).StartParams).toEqual({
      RuntimeContextSizeLimit: 614400,
    })
    expect(session.StartParams).toBeUndefined()
  })
})

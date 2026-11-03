import { describe, expect, it } from 'vitest'
import type { AISession } from '../../type/aiChat'
import { mergeAISessionUpdate } from '../mergeAISessionUpdate'

const baseSession = {
  SessionID: 's-1',
  Title: '原标题',
  StartParams: {
    SyncPerceptionTrigger: true,
    EnablePlan: true,
    SingleModelMode: false,
    DisableMemoryTriage: false,
    Strategy: {
      EnableMultiAgent: true,
      EnableGoalMode: false,
      GoalMinIterations: 1,
      MaxSubAgents: 2,
    },
  },
} as AISession

describe('mergeAISessionUpdate', () => {
  it('sessionId 不匹配时返回原对象', () => {
    expect(mergeAISessionUpdate(baseSession, 'other', { Title: 'x' })).toBe(baseSession)
  })

  it('合并标题，并对 StartParams/Strategy 做字段级合并', () => {
    const next = mergeAISessionUpdate(baseSession, 's-1', {
      Title: '新标题',
      StartParams: {
        EnablePlan: false,
        Strategy: { MaxSubAgents: 9 },
      },
    })
    expect(next).toMatchObject({
      SessionID: 's-1',
      Title: '新标题',
      StartParams: {
        SyncPerceptionTrigger: true,
        EnablePlan: false,
        SingleModelMode: false,
        DisableMemoryTriage: false,
        Strategy: {
          EnableMultiAgent: true,
          EnableGoalMode: false,
          GoalMinIterations: 1,
          MaxSubAgents: 9,
        },
      },
    })
  })
})

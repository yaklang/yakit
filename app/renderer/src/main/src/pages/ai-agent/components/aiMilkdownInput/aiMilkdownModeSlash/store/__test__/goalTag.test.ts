import { describe, expect, it } from 'vitest'
import type { AIExecutionStrategy } from '@/pages/ai-re-act/hooks/grpcApi'
import { deriveGoalTagFromStrategy } from '../goalTag'

const baseStrategy = (partial: Partial<AIExecutionStrategy> = {}): AIExecutionStrategy =>
  ({
    EnableMultiAgent: false,
    EnableGoalMode: true,
    GoalMinIterations: 0,
    MaxSubAgents: 3,
    GoalDurationSeconds: 0,
    GoalAcceptanceCriteria: '',
    ...partial,
  }) as AIExecutionStrategy

describe('deriveGoalTagFromStrategy', () => {
  it('无 strategy 或未开 Goal 模式 → null', () => {
    expect(deriveGoalTagFromStrategy(undefined)).toEqual({
      kind: null,
      durationKey: null,
      acceptanceText: null,
    })
    expect(deriveGoalTagFromStrategy(null)).toEqual({
      kind: null,
      durationKey: null,
      acceptanceText: null,
    })
    expect(
      deriveGoalTagFromStrategy(
        baseStrategy({
          EnableGoalMode: false,
          GoalAcceptanceCriteria: 'done',
          GoalDurationSeconds: 3600,
          GoalMinIterations: 3,
        }),
      ),
    ).toEqual({ kind: null, durationKey: null, acceptanceText: null })
  })

  it('验收条件优先于持续时间与最小迭代', () => {
    expect(
      deriveGoalTagFromStrategy(
        baseStrategy({
          GoalAcceptanceCriteria: '  完成验收  ',
          GoalDurationSeconds: 3600,
          GoalMinIterations: 5,
        }),
      ),
    ).toEqual({
      kind: 'acceptance',
      durationKey: null,
      acceptanceText: '完成验收',
    })
  })

  it('仅空白验收条件视为未设置', () => {
    expect(
      deriveGoalTagFromStrategy(
        baseStrategy({
          GoalAcceptanceCriteria: '   ',
          GoalDurationSeconds: 3600,
        }),
      ),
    ).toEqual({ kind: 'duration', durationKey: '1h', acceptanceText: null })
  })

  it('持续时间优先于最小迭代（含 never 与未知秒数）', () => {
    expect(
      deriveGoalTagFromStrategy(
        baseStrategy({
          GoalDurationSeconds: -1,
          GoalMinIterations: 3,
        }),
      ),
    ).toEqual({ kind: 'duration', durationKey: 'never', acceptanceText: null })

    expect(
      deriveGoalTagFromStrategy(
        baseStrategy({
          GoalDurationSeconds: 7200,
          GoalMinIterations: 3,
        }),
      ),
    ).toEqual({ kind: 'duration', durationKey: '7200', acceptanceText: null })
  })

  it('仅最小迭代 > 0 时推导为 iterations', () => {
    expect(
      deriveGoalTagFromStrategy(
        baseStrategy({
          GoalMinIterations: 3,
        }),
      ),
    ).toEqual({ kind: 'iterations', durationKey: null, acceptanceText: null })
  })

  it('Goal 开启但三选一均未设置 → null', () => {
    expect(deriveGoalTagFromStrategy(baseStrategy())).toEqual({
      kind: null,
      durationKey: null,
      acceptanceText: null,
    })
    expect(
      deriveGoalTagFromStrategy(
        baseStrategy({
          GoalMinIterations: 0,
          GoalDurationSeconds: 0,
          GoalAcceptanceCriteria: '',
        }),
      ),
    ).toEqual({ kind: null, durationKey: null, acceptanceText: null })
  })
})

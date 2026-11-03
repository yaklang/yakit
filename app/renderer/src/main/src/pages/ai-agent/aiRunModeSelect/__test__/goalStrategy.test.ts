import { describe, expect, it } from 'vitest'
import {
  buildGoalCondition,
  clearGoalStrategy,
  getGoalConditionKind,
  normalizeExecutionStrategy,
} from '../goalStrategy'
import type { AIExecutionStrategy } from '@/pages/ai-re-act/hooks/grpcApi'

describe('official Goal condition rules', () => {
  it.each([
    ['iterations', 4, { GoalMinIterations: 4, GoalDurationSeconds: 0, GoalAcceptanceCriteria: '' }],
    ['duration', 600, { GoalMinIterations: 0, GoalDurationSeconds: 600, GoalAcceptanceCriteria: '' }],
    ['duration', -1, { GoalMinIterations: 0, GoalDurationSeconds: -1, GoalAcceptanceCriteria: '' }],
    [
      'acceptance',
      '  evidence report  ',
      { GoalMinIterations: 0, GoalDurationSeconds: 0, GoalAcceptanceCriteria: 'evidence report' },
    ],
  ] as const)('applies %s exclusively, including value %s', (kind, value, fields) => {
    expect(buildGoalCondition(kind, value)).toEqual({ EnableGoalMode: true, ...fields })
  })

  it.each([
    ['iterations', 0],
    ['iterations', -1],
    ['iterations', 1.5],
    ['duration', 0],
    ['duration', -2],
    ['duration', Infinity],
    ['duration', Number.MAX_SAFE_INTEGER + 1],
    ['acceptance', ''],
    ['acceptance', '  '],
    ['duration', '600'],
  ] as const)('does not create a patch for invalid %s value %s', (kind, value) => {
    expect(buildGoalCondition(kind, value)).toBeUndefined()
  })

  it('clears every Goal gate without resetting Multi-Agent fields', () => {
    const current = {
      EnableMultiAgent: true,
      MaxSubAgents: 7,
      EnableGoalMode: true,
      GoalMinIterations: 4,
      GoalDurationSeconds: 600,
      GoalAcceptanceCriteria: 'old',
    }
    const next = { ...current, ...clearGoalStrategy() }
    expect(next).toEqual({
      EnableMultiAgent: true,
      MaxSubAgents: 7,
      EnableGoalMode: false,
      GoalMinIterations: 0,
      GoalDurationSeconds: 0,
      GoalAcceptanceCriteria: '',
    })
    expect(current.GoalDurationSeconds).toBe(600)
  })

  it('restores int64 history values, including the continuous sentinel, without losing fields', () => {
    const historical = {
      EnableGoalMode: true,
      GoalMinIterations: '4',
      GoalDurationSeconds: '-1',
      MaxSubAgents: '3',
      GoalAcceptanceCriteria: 'report',
    } as unknown as AIExecutionStrategy
    expect(normalizeExecutionStrategy(historical)).toEqual({
      EnableGoalMode: true,
      EnableMultiAgent: false,
      GoalMinIterations: 4,
      GoalDurationSeconds: -1,
      MaxSubAgents: 3,
      GoalAcceptanceCriteria: 'report',
    })
    expect(historical.GoalDurationSeconds).toBe('-1')
  })

  it('normalizes old or invalid strategy fields to server defaults', () => {
    expect(normalizeExecutionStrategy(undefined)).toEqual({
      EnableGoalMode: false,
      EnableMultiAgent: false,
      GoalMinIterations: 0,
      GoalDurationSeconds: 0,
      MaxSubAgents: 0,
      GoalAcceptanceCriteria: '',
    })
    expect(normalizeExecutionStrategy({ GoalDurationSeconds: -5, GoalMinIterations: NaN })).toMatchObject({
      GoalDurationSeconds: 0,
      GoalMinIterations: 0,
    })
  })

  it.each([
    [{ GoalAcceptanceCriteria: 'report', GoalDurationSeconds: 600 }, 'acceptance'],
    [{ GoalDurationSeconds: -1 }, 'duration'],
    [{ GoalDurationSeconds: 600 }, 'duration'],
    [{ GoalMinIterations: 3 }, 'iterations'],
    [{}, 'iterations'],
  ] as const)('restores the condition kind for %j', (strategy, expected) => {
    expect(getGoalConditionKind(strategy)).toBe(expected)
  })
})

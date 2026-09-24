import type { AIExecutionStrategy } from '@/pages/ai-re-act/hooks/grpcApi'
import { goalDurationSecondsToKey } from '../../constants'

/** 从会话 Strategy 推导可见 Goal 标签（切会话 / 刷新后与 setting 一致） */
export type DerivedGoalTag =
  | { kind: null; durationKey: null; acceptanceText: null }
  | { kind: 'duration'; durationKey: string; acceptanceText: null }
  | { kind: 'iterations'; durationKey: null; acceptanceText: null }
  | { kind: 'acceptance'; durationKey: null; acceptanceText: string }

export const deriveGoalTagFromStrategy = (strategy?: AIExecutionStrategy | null): DerivedGoalTag => {
  if (!strategy?.EnableGoalMode) {
    return { kind: null, durationKey: null, acceptanceText: null }
  }
  const acceptance = strategy.GoalAcceptanceCriteria?.trim() || null
  if (acceptance) {
    return { kind: 'acceptance', durationKey: null, acceptanceText: acceptance }
  }
  const seconds = strategy.GoalDurationSeconds ?? 0
  if (seconds !== 0) {
    const durationKey = goalDurationSecondsToKey(seconds)
    if (durationKey) {
      return { kind: 'duration', durationKey, acceptanceText: null }
    }
  }
  if ((strategy.GoalMinIterations ?? 0) > 0) {
    return { kind: 'iterations', durationKey: null, acceptanceText: null }
  }
  return { kind: null, durationKey: null, acceptanceText: null }
}

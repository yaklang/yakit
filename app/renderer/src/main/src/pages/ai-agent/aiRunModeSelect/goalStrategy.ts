import type { AIExecutionStrategy } from '@/pages/ai-re-act/hooks/grpcApi'

export type GoalConditionKind = 'iterations' | 'duration' | 'acceptance'

/** gRPC int64 可返回字符串；旧历史缺新字段时仍使用服务端默认语义。 */
export const normalizeExecutionStrategy = (strategy?: AIExecutionStrategy): AIExecutionStrategy => {
  const positiveInteger = (value: unknown) => {
    const number = Number(value)
    return Number.isSafeInteger(number) && number > 0 ? number : 0
  }
  return {
    ...strategy,
    EnableMultiAgent: !!strategy?.EnableMultiAgent,
    EnableGoalMode: !!strategy?.EnableGoalMode,
    GoalMinIterations: positiveInteger(strategy?.GoalMinIterations),
    MaxSubAgents: positiveInteger(strategy?.MaxSubAgents),
    GoalDurationSeconds:
      Number(strategy?.GoalDurationSeconds) === -1 ? -1 : positiveInteger(strategy?.GoalDurationSeconds),
    GoalAcceptanceCriteria: typeof strategy?.GoalAcceptanceCriteria === 'string' ? strategy.GoalAcceptanceCriteria : '',
  }
}

/** 对齐官方 Goal 三选一与关闭清理规则，不改动 Multi-Agent 配置。 */
export const clearGoalStrategy = (): AIExecutionStrategy => ({
  EnableGoalMode: false,
  GoalMinIterations: 0,
  GoalDurationSeconds: 0,
  GoalAcceptanceCriteria: '',
})

export const getGoalConditionKind = (strategy?: AIExecutionStrategy): GoalConditionKind => {
  if (strategy?.GoalAcceptanceCriteria?.trim()) return 'acceptance'
  if (strategy?.GoalDurationSeconds && (strategy.GoalDurationSeconds > 0 || strategy.GoalDurationSeconds === -1)) {
    return 'duration'
  }
  return 'iterations'
}

/** 返回完整的 Goal 字段补丁，切换条件时显式清空另外两项；非法输入不生成补丁。 */
export const buildGoalCondition = (
  kind: GoalConditionKind,
  value: number | string,
): AIExecutionStrategy | undefined => {
  const base = { ...clearGoalStrategy(), EnableGoalMode: true }
  if (kind === 'acceptance') {
    if (typeof value !== 'string' || !value.trim()) return
    return { ...base, GoalAcceptanceCriteria: value.trim() }
  }
  if (typeof value !== 'number' || !Number.isSafeInteger(value)) return
  if (kind === 'iterations') return value >= 1 ? { ...base, GoalMinIterations: value } : undefined
  return value === -1 || value > 0 ? { ...base, GoalDurationSeconds: value } : undefined
}

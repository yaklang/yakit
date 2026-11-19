/** 将 token 数按千（K）或百万（M）缩写，最多保留一位小数。缺失、非有限值或负数显示为「—」。 */
export const formatModelContextTokens = (tokens?: number): string => {
  if (tokens === undefined || !Number.isFinite(tokens) || tokens < 0) return '—'
  if (tokens >= 1000000) return `${Number((tokens / 1000000).toFixed(1))}M`
  if (tokens >= 1000) return `${Number((tokens / 1000).toFixed(1))}K`
  return String(tokens)
}

/**
 * 按压缩阈值计算当前用量。未启用、用量无效或阈值不是有限正数时返回 undefined。
 * 百分比四舍五入到整数，可以超过 100%；超过阈值时剩余 token 数为 0。
 */
export const getModelContextUsage = (enabled: boolean, promptTokens?: number, thresholdTokens?: number) => {
  if (
    !enabled ||
    promptTokens === undefined ||
    !Number.isFinite(promptTokens) ||
    promptTokens < 0 ||
    thresholdTokens === undefined ||
    !Number.isFinite(thresholdTokens) ||
    thresholdTokens <= 0
  )
    return undefined

  return {
    promptTokens,
    thresholdTokens,
    percent: Math.round((promptTokens / thresholdTokens) * 100),
    remaining: Math.max(0, thresholdTokens - promptTokens),
  }
}

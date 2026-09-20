import type { Risk } from '../schema'

export const getDiscoveryTimeColumnFixed = (excludeColumnsKey: string[]): 'right' | undefined => {
  return excludeColumnsKey.includes('action') ? 'right' : undefined
}

/** grpc int64 经 Electron 会变成 string，游标/去重统一转成数字 */
export const toRiskNumericId = (id: unknown): number => {
  const n = Number(id)
  return Number.isFinite(n) && n > 0 ? n : 0
}

export const isRiskTableInitPage = (page?: number | string): boolean => Number(page) === 1

/** 非首页必须带上有效 FromId/UntilId，否则会把「当前最新一页」再 concat 一遍 */
export const shouldSkipRiskCursorPage = (
  isInit: boolean,
  order: string | undefined,
  fromId: unknown,
  untilId: unknown,
): boolean => {
  if (isInit) return false
  if (order === 'asc') return toRiskNumericId(fromId) <= 0
  return toRiskNumericId(untilId) <= 0
}

export const dedupeRisksById = <T extends { Id?: unknown }>(rows: T[]): Array<T & { Id: number }> => {
  const seen = new Set<number>()
  const result: Array<T & { Id: number }> = []
  for (const row of rows || []) {
    const id = toRiskNumericId(row?.Id)
    if (!id || seen.has(id)) continue
    seen.add(id)
    result.push({ ...row, Id: id })
  }
  return result
}

export const mergeRisksById = <T extends { Id?: unknown }>(
  incoming: Array<T | { Id?: unknown }>,
  existing: Array<T | { Id?: unknown }>,
  mode: 'prepend' | 'append',
): Array<T & { Id: number }> =>
  dedupeRisksById(
    (mode === 'prepend'
      ? [...(incoming || []), ...(existing || [])]
      : [...(existing || []), ...(incoming || [])]) as T[],
  )

export const countNewRiskIds = (incoming: Array<{ Id?: unknown }>, existing: Array<{ Id?: unknown }>): number => {
  const seen = new Set((existing || []).map((row) => toRiskNumericId(row?.Id)).filter((id) => id > 0))
  const incomingSeen = new Set<number>()
  let n = 0
  for (const row of incoming || []) {
    const id = toRiskNumericId(row?.Id)
    if (!id || seen.has(id) || incomingSeen.has(id)) continue
    incomingSeen.add(id)
    n += 1
  }
  return n
}

export const nextIncrementFromId = <T extends { Id?: unknown }>(rows: T[], currentFromId: unknown): number => {
  const first = toRiskNumericId(rows?.[0]?.Id)
  return Math.max(first, toRiskNumericId(currentFromId))
}

export const isShowCodeScanDetail = (selectItem: Risk) => {
  const { ResultID, SyntaxFlowVariable, ProgramName } = selectItem
  if (ResultID && SyntaxFlowVariable && ProgramName) {
    return true
  }
  return false
}

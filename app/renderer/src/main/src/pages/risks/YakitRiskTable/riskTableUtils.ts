import type { Risk } from '../schema'

export const getDiscoveryTimeColumnFixed = (excludeColumnsKey: string[]): 'right' | undefined => {
  return excludeColumnsKey.includes('action') ? 'right' : undefined
}

/** 保留超出安全整数范围的 gRPC ID，同时兼容原有的数字 ID。 */
export const normalizeRiskId = (id: unknown): Risk['Id'] => {
  if (typeof id === 'number') return Number.isSafeInteger(id) && id > 0 ? id : 0
  if (typeof id !== 'string' || !/^\d+$/.test(id)) return 0
  const value = id.replace(/^0+(?=\d)/, '')
  const number = Number(value)
  return Number.isSafeInteger(number) ? number : value
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
  return !normalizeRiskId(order === 'asc' ? fromId : untilId)
}

export const dedupeRisksById = <T extends { Id?: unknown }>(rows: T[]): Array<Omit<T, 'Id'> & Pick<Risk, 'Id'>> => {
  const seen = new Set<Risk['Id']>()
  const result: Array<Omit<T, 'Id'> & Pick<Risk, 'Id'>> = []
  for (const row of rows || []) {
    const id = normalizeRiskId(row?.Id)
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
): Array<Omit<T, 'Id'> & Pick<Risk, 'Id'>> =>
  dedupeRisksById(
    (mode === 'prepend'
      ? [...(incoming || []), ...(existing || [])]
      : [...(existing || []), ...(incoming || [])]) as T[],
  )

export const countNewRiskIds = (incoming: Array<{ Id?: unknown }>, existing: Array<{ Id?: unknown }>): number => {
  const seen = new Set((existing || []).map((row) => normalizeRiskId(row?.Id)).filter(Boolean))
  const incomingSeen = new Set<Risk['Id']>()
  let n = 0
  for (const row of incoming || []) {
    const id = normalizeRiskId(row?.Id)
    if (!id || seen.has(id) || incomingSeen.has(id)) continue
    incomingSeen.add(id)
    n += 1
  }
  return n
}

export const nextIncrementFromId = <T extends { Id?: unknown }>(rows: T[], currentFromId: unknown): Risk['Id'] => {
  const first = normalizeRiskId(rows?.[0]?.Id)
  const current = normalizeRiskId(currentFromId)
  return BigInt(first) > BigInt(current) ? first : current
}

export const isShowCodeScanDetail = (selectItem: Risk) => {
  const { ResultID, SyntaxFlowVariable, ProgramName } = selectItem
  if (ResultID && SyntaxFlowVariable && ProgramName) {
    return true
  }
  return false
}

/** 合并处置日志，按创建时间倒序排列，并以 id 去重。 */
export const mergeDisposalLogs = <T extends { id: number; createdAt?: number }>(previous: T[], incoming: T[]): T[] => {
  const byId = new Map(previous.map((item) => [item.id, item]))
  incoming.forEach((item) => byId.set(item.id, item))

  return [...byId.values()].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0) || b.id - a.id)
}

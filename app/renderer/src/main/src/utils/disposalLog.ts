/** 按后端返回顺序追加分页日志，以 id 去重并原位更新重叠记录。 */
export const mergeDisposalLogs = <T extends { id: number }>(previous: T[], incoming: T[]): T[] => {
  const byId = new Map(previous.map((item) => [item.id, item]))
  incoming.forEach((item) => byId.set(item.id, item))

  return [...byId.values()]
}

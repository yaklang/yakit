/** 按后端顺序合并分页日志，并从已加载记录中补全回复引用。 */
export const mergeDisposalLogs = <
  T extends { id: number; description?: string; parentComment?: { id: number; description: string } },
>(
  previous: T[],
  incoming: T[],
): T[] => {
  const byId = new Map(previous.map((item) => [item.id, item]))
  incoming.forEach((item) => byId.set(item.id, item))

  return [...byId.values()].map((item) => {
    if (!item.parentComment) return item
    const description = byId.get(item.parentComment.id)?.description
    if (description === undefined || description === item.parentComment.description) return item
    return { ...item, parentComment: { ...item.parentComment, description } }
  })
}

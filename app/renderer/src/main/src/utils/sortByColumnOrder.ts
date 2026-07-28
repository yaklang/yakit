/** 按 columnsOrder 预建索引 Map，避免列排序时重复 indexOf */
export function buildColumnOrderMap(columnsOrder: string[]) {
  const map = new Map<string, number>()
  columnsOrder.forEach((key, index) => map.set(key, index))
  return map
}

export function compareByColumnOrder(aKey: string, bKey: string, orderMap: Map<string, number>) {
  const aIndex = orderMap.get(aKey)
  const bIndex = orderMap.get(bKey)
  if (aIndex === undefined && bIndex === undefined) return 0
  if (aIndex === undefined) return 1
  if (bIndex === undefined) return -1
  return aIndex - bIndex
}

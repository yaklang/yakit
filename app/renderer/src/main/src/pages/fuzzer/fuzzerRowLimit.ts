/** 列表只留最新的 limit 条，更早的行从头部丢掉。 */
export function appendFuzzerRow<T>(list: T[], row: T, limit: number, onEvict?: (row: T) => void) {
  list.push(row)
  const cap = limit > 0 ? limit : list.length
  while (list.length > cap) {
    const oldest = list.shift()
    if (oldest) onEvict?.(oldest)
  }
}

/** 按 fuzzer 节点把结果放进对应列表，并套用同一条数上限。 */
export function appendIndexedFuzzerRow<T>(
  bucket: Map<string, T[]>,
  key: string,
  row: T,
  limit: number,
  onEvict?: (row: T) => void,
) {
  const list = bucket.get(key) || []
  appendFuzzerRow(list, row, limit, onEvict)
  bucket.set(key, list)
}

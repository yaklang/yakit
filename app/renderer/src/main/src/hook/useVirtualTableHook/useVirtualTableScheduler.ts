export interface VirtualTableViewportSnapshot {
  scrollTop?: number
  clientHeight?: number
  scrollHeight?: number
  serverPushActive: boolean
}

export type VirtualTableAutoRefreshAction = 'none' | 'start-poll' | 'stop-poll' | 'refresh-once'
export const VIRTUAL_TABLE_SCROLL_REFRESH_DELTA = 28

/**
 * A specialized table can have its own ordered stream in addition to the
 * shared duplex connection. Either healthy push source is enough to keep the
 * one-second compatibility poller stopped.
 */
export const resolveVirtualTableServerPushActive = (
  sharedDuplexActive: boolean,
  getAdditionalServerPushActive?: () => boolean,
) => sharedDuplexActive || getAdditionalServerPushActive?.() === true

export interface VirtualTableServerPushMerge<T> {
  data: T[]
  inserted: number
  clipped: boolean
}

/** Select valid pushed rows without constructing the merged table array. */
export const selectVirtualTableServerPushRows = <T extends Record<string, any>>(
  current: T[],
  incoming: T[],
  idKey: string,
): T[] => {
  const seen = new Set<number>()
  for (const row of current) {
    const id = Number(row[idKey])
    if (Number.isFinite(id) && id > 0) seen.add(id)
  }

  const insertedRows: T[] = []
  for (const row of incoming) {
    const id = Number(row[idKey])
    if (!Number.isFinite(id) || id <= 0 || seen.has(id)) continue
    seen.add(id)
    insertedRows.push(row)
  }
  return insertedRows
}

/**
 * Prepend rows already validated against the exact current snapshot. This is
 * the allocation-light path used when React has not changed that snapshot.
 */
export const prependAcceptedVirtualTableServerPushRows = <T>(
  current: T[],
  acceptedRows: T[],
  maxDataLength = 0,
): VirtualTableServerPushMerge<T> => {
  if (!acceptedRows.length) {
    const clipped = maxDataLength > 0 && current.length > maxDataLength
    return {
      data: clipped ? current.slice(0, maxDataLength) : current,
      inserted: 0,
      clipped,
    }
  }

  const merged = [...acceptedRows, ...current]
  const clipped = maxDataLength > 0 && merged.length > maxDataLength
  return {
    data: clipped ? merged.slice(0, maxDataLength) : merged,
    inserted: acceptedRows.length,
    clipped,
  }
}

/** Merge newest-first pushed rows without duplicating a bootstrap/query row. */
export const mergeVirtualTableServerPushRows = <T extends Record<string, any>>(
  current: T[],
  incoming: T[],
  idKey: string,
  maxDataLength = 0,
): VirtualTableServerPushMerge<T> => {
  const acceptedRows = selectVirtualTableServerPushRows(current, incoming, idKey)
  return prependAcceptedVirtualTableServerPushRows(current, acceptedRows, maxDataLength)
}

/** Decide how the table should react to its sampled viewport state. */
export const selectVirtualTableAutoRefreshAction = (
  previous: VirtualTableViewportSnapshot | undefined,
  current: VirtualTableViewportSnapshot,
): VirtualTableAutoRefreshAction => {
  if (current.serverPushActive) {
    const previousScrollTop = Number(previous?.scrollTop)
    const currentScrollTop = Number(current.scrollTop)
    const userScrollChanged =
      !!previous &&
      Number.isFinite(previousScrollTop) &&
      Number.isFinite(currentScrollTop) &&
      Math.abs(currentScrollTop - previousScrollTop) >= VIRTUAL_TABLE_SCROLL_REFRESH_DELTA
    return userScrollChanged ? 'refresh-once' : 'stop-poll'
  }

  if (!previous) return 'start-poll'
  if (previous.serverPushActive) return 'start-poll'

  const viewportChanged =
    previous.scrollTop !== current.scrollTop ||
    previous.clientHeight !== current.clientHeight ||
    previous.scrollHeight !== current.scrollHeight
  return viewportChanged ? 'start-poll' : 'none'
}

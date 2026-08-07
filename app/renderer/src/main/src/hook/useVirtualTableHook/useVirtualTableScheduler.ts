export interface VirtualTableViewportSnapshot {
  scrollTop?: number
  clientHeight?: number
  scrollHeight?: number
  serverPushActive: boolean
}

export type VirtualTableAutoRefreshAction = 'none' | 'start-poll' | 'stop-poll' | 'refresh-once'
export const VIRTUAL_TABLE_SCROLL_REFRESH_DELTA = 28
export const VIRTUAL_TABLE_BOTTOM_PREFETCH_ROWS = 10

/**
 * Return the number of older rows needed after a table viewport grows.
 *
 * Detail collapse and filter/query transitions can finish using the previous,
 * smaller viewport height. Keep the existing window and ask only for enough
 * bottom rows to fill the new viewport plus the normal prefetch margin.
 */
export const selectVirtualTableViewportFillLimit = (
  rowCount: number,
  total: number,
  viewportHeight: number | undefined,
  rowHeight: number,
  prefetchRows = VIRTUAL_TABLE_BOTTOM_PREFETCH_ROWS,
): number => {
  if (
    !Number.isFinite(rowCount) ||
    !Number.isFinite(total) ||
    !Number.isFinite(viewportHeight) ||
    !Number.isFinite(rowHeight) ||
    rowCount < 0 ||
    total <= rowCount ||
    Number(viewportHeight) <= 0 ||
    rowHeight <= 0
  ) {
    return 0
  }

  const targetRows = Math.ceil(Number(viewportHeight) / rowHeight) + Math.max(0, Math.floor(prefetchRows))
  return Math.min(total - rowCount, Math.max(0, targetRows - rowCount))
}

export const selectVirtualTableAutomaticRefreshReason = (
  hasQueriedViewport: boolean,
  previousInViewport: boolean,
): 'query' | 'visibility' => (hasQueriedViewport && !previousInViewport ? 'visibility' : 'query')

/**
 * A cached table returning to the foreground keeps its existing data window
 * and scroll anchor. A first load, an empty window, or parameters changed while
 * hidden still needs a full query.
 */
export const shouldRestoreVirtualTableViewport = (
  reason: 'query' | 'visibility' | 'manual',
  rowCount: number,
  paramsChanged: boolean,
): boolean => reason === 'visibility' && rowCount > 0 && !paramsChanged

/**
 * Sliding tables must wait until the user consumes the page that was just
 * appended, otherwise clipping can immediately trigger another request. Keep
 * that guard, but prefetch before the final row so scrolling does not visibly
 * stall at the boundary.
 */
export const shouldLoadVirtualTableBottom = (
  scrollTop: number | undefined,
  clientHeight: number | undefined,
  scrollHeight: number | undefined,
  isSliding: boolean,
  rowHeight: number,
): boolean => {
  if (
    !Number.isFinite(scrollTop) ||
    !Number.isFinite(clientHeight) ||
    !Number.isFinite(scrollHeight) ||
    Number(scrollHeight) <= 0
  ) {
    return false
  }

  const visibleBottom = Number(scrollTop) + Number(clientHeight)
  if (visibleBottom / Number(scrollHeight) <= 0.9) return false
  if (!isSliding) return true

  const remaining = Math.max(0, Number(scrollHeight) - visibleBottom)
  return remaining <= rowHeight * VIRTUAL_TABLE_BOTTOM_PREFETCH_ROWS
}

/**
 * A specialized table can have its own ordered stream in addition to the
 * shared duplex connection. Either healthy push source is enough to keep the
 * one-second compatibility poller stopped.
 */
export const resolveVirtualTableServerPushActive = (
  sharedDuplexActive: boolean,
  getAdditionalServerPushActive?: () => boolean,
) => sharedDuplexActive || getAdditionalServerPushActive?.() === true

/**
 * Merge query pages and the current viewport without duplicate IDs. For the
 * monotonic ID/created_at orders used by live MITM, sorting after de-duplication
 * also repairs a page that completed after a newer pushed row was committed.
 * Groups are ordered by data freshness: the first copy of an ID wins.
 */
export const mergeUniqueVirtualTableRows = <T extends Record<string, any>>(
  groups: ReadonlyArray<ReadonlyArray<T>>,
  idKey: string,
  order: string,
  orderBy: string,
): T[] => {
  const seen = new Set<number>()
  const rows: T[] = []
  for (const group of groups) {
    for (const row of group) {
      const id = Number(row[idKey])
      if (!Number.isFinite(id) || id <= 0 || seen.has(id)) continue
      seen.add(id)
      rows.push(row)
    }
  }

  if (['id', 'created_at'].includes(String(orderBy).toLowerCase())) {
    const direction = order === 'asc' ? 1 : -1
    rows.sort((left, right) => direction * (Number(left[idKey]) - Number(right[idKey])))
  }
  return rows
}

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

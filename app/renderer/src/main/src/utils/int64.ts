/** Preserve decimal IDs from protobuf and historic IndexedDB rows without rounding. */
export function int64String(value: string | number | bigint): string {
  if (typeof value === 'number' && !Number.isSafeInteger(value)) throw new RangeError('Unsafe numeric int64')
  const text = String(value)
  if (!/^-?\d+$/.test(text)) throw new TypeError('Invalid int64')
  const integer = BigInt(text)
  if (integer < -(BigInt(1) << BigInt(63)) || integer > (BigInt(1) << BigInt(63)) - BigInt(1))
    throw new RangeError('int64 out of range')
  return integer.toString()
}

/** Only use where the business field must enter a numeric UI/date API. IDs stay strings. */
export function int64ToSafeNumber(value: string | number): number {
  const number = Number(int64String(value))
  if (!Number.isSafeInteger(number)) throw new RangeError('int64 exceeds JavaScript safe integer range')
  return number
}

export function grpcPagingToUI(
  value: { Page: string | number; Limit: string | number; OrderBy?: string; Order?: string } | null | undefined,
) {
  return {
    Page: int64ToSafeNumber(value?.Page || 1),
    Limit: int64ToSafeNumber(value?.Limit || 20),
    OrderBy: value?.OrderBy || 'id',
    Order: value?.Order === 'asc' ? ('asc' as const) : ('desc' as const),
  }
}

/** Compare decimal IDs without rounding adjacent values above 2^53. */
export function compareInt64(left: string | number, right: string | number): -1 | 0 | 1 {
  const a = BigInt(int64String(left))
  const b = BigInt(int64String(right))
  return a < b ? -1 : a > b ? 1 : 0
}

export function maxInt64(...values: (string | number)[]): string {
  return values.reduce<string>(
    (largest, value) => (compareInt64(value, largest) > 0 ? int64String(value) : largest),
    '0',
  )
}

/** Invalid or absent cursor values represent an unset boundary. */
export function nonNegativeInt64(value: unknown): string {
  if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'bigint') return '0'
  try {
    const id = int64String(value)
    return BigInt(id) < BigInt(0) ? '0' : id
  } catch {
    return '0'
  }
}

/** Project wire paging into numeric table controls while retaining row DTOs unchanged. */
export function grpcPageForUI<T extends { Pagination: Parameters<typeof grpcPagingToUI>[0]; Total: string | number }>(
  value: T,
): Omit<T, 'Pagination' | 'Total'> & { Pagination: ReturnType<typeof grpcPagingToUI>; Total: number } {
  return { ...value, Pagination: grpcPagingToUI(value.Pagination), Total: int64ToSafeNumber(value.Total) }
}

/** Optional positive identifier, useful when falling back to a previous saved record. */
export function positiveInt64(value: unknown): string | undefined {
  const id = nonNegativeInt64(value)
  return id === '0' ? undefined : id
}

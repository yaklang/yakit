export const BATCH_SCOPE_SIZE = 1000

export interface BatchScope {
  index: number
  page: number
  limit: number
  start: number
  end: number
  count: number
}

export const buildBatchScopes = (total: number, limit = BATCH_SCOPE_SIZE): BatchScope[] => {
  if (!Number.isSafeInteger(total) || total < 0) throw new Error('batch total must be a non-negative safe integer')
  if (!Number.isSafeInteger(limit) || limit <= 0) throw new Error('batch scope limit must be a positive safe integer')
  return Array.from({ length: Math.ceil(total / limit) }, (_, index) => {
    const page = index + 1
    const start = index * limit + 1
    const end = Math.min(page * limit, total)
    return { index, page, limit, start, end, count: end - start + 1 }
  })
}

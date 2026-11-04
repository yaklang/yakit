import type { AITool, GetAIToolListRequest, GetAIToolListResponse } from '../ai-agent/type/aiTool'
import { genDefaultPagination } from '../invoker/schema'
/** Resolve all matching pages explicitly; never let an empty name list mean export-everything. */
export async function collectAIToolExportNames(
  fetchPage: (request: GetAIToolListRequest) => Promise<GetAIToolListResponse>,
  filter: Pick<GetAIToolListRequest, 'Query' | 'OnlyFavorites'>,
  excluded: ReadonlySet<number> = new Set(),
) {
  const found = new Map<number, AITool>()
  for (let page = 1; page <= 10000; page++) {
    const res = await fetchPage({ ...filter, ToolName: '', Pagination: genDefaultPagination(100, page) })
    const rows = res.Tools || []
    const before = found.size
    rows.forEach((item) => found.set(item.ID, item))
    if (found.size >= Number(res.Total))
      return [...found.values()]
        .filter((item) => !excluded.has(item.ID))
        .map((item) => item.Name)
        .filter(Boolean)
    if (!rows.length || found.size === before) throw new Error('Incomplete tool export selection')
  }
  throw new Error('Too many pages')
}

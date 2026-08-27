import type { QueryAIForgeRequest, QueryAIForgeResponse } from '@/pages/ai-agent/type/forge'
import { getDigitalEmployeeRoleId } from '@/pages/digitalEmployee/roleAssignment'

const ROLE_FILTER_PAGE_SIZE = 100

type QueryAIForge = (request: QueryAIForgeRequest, hiddenError?: boolean) => Promise<QueryAIForgeResponse>

/**
 * 部分已发布引擎虽然能保存并返回 Forge.Tag，但 AIForgeFilter.Tag 查询不会返回对应记录。
 * 角色页签因此统一分页读取候选集，再使用与卡片展示相同的角色解析规则在前端精确过滤。
 */
export const queryAIForgeByDigitalEmployeeRole = async (
  query: QueryAIForge,
  request: QueryAIForgeRequest,
  roleId: string,
): Promise<QueryAIForgeResponse> => {
  const { Tag: _ignoredRoleFilter, ...filter } = request.Filter || {}
  const pagination = {
    ...request.Pagination,
    Page: 1,
    Limit: Math.max(Number(request.Pagination.Limit) || 0, ROLE_FILTER_PAGE_SIZE),
  }
  const createRequest = (page: number): QueryAIForgeRequest => ({
    ...request,
    Pagination: { ...pagination, Page: page },
    Filter: Object.keys(filter).length ? filter : undefined,
  })

  const firstPage = await query(createRequest(1))
  const pageCount = Math.ceil(Number(firstPage.Total || 0) / pagination.Limit)
  const remainingPages =
    pageCount > 1
      ? await Promise.all(Array.from({ length: pageCount - 1 }, (_, index) => query(createRequest(index + 2))))
      : []
  const agentMap = new Map<number, QueryAIForgeResponse['Data'][number]>()
  ;[firstPage, ...remainingPages].forEach((response) => {
    ;(response.Data || []).forEach((agent) => agentMap.set(agent.Id, agent))
  })
  const roleAgents = [...agentMap.values()].filter((agent) => getDigitalEmployeeRoleId(agent) === roleId)

  return {
    ...firstPage,
    Pagination: pagination,
    Data: roleAgents,
    Total: roleAgents.length,
  }
}

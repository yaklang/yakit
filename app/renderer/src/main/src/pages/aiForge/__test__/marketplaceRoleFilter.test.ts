import { describe, expect, it, vi } from 'vitest'
import type { AIForge, QueryAIForgeRequest, QueryAIForgeResponse } from '@/pages/ai-agent/type/forge'
import { createDigitalEmployeeRoleTag } from '@/pages/digitalEmployee/roleAssignment'
import { queryAIForgeByDigitalEmployeeRole } from '../marketplaceRoleFilter'

const forge = (Id: number, roleId: string): AIForge => ({
  Id,
  ForgeName: `forge-${Id}`,
  ForgeType: 'config',
  Tag: [createDigitalEmployeeRoleTag(roleId)],
})

describe('marketplace role filter', () => {
  it('filters returned Forge tags locally without sending the incompatible server Tag filter', async () => {
    const query = vi.fn(
      async (request: QueryAIForgeRequest): Promise<QueryAIForgeResponse> => ({
        Pagination: request.Pagination,
        Data: [forge(1, 'threat-analyst'), forge(2, 'incident-responder')],
        Total: 2,
      }),
    )

    const response = await queryAIForgeByDigitalEmployeeRole(
      query,
      {
        Pagination: { Page: 1, Limit: 20, OrderBy: 'updated_at', Order: 'desc' },
        Filter: { Tag: [createDigitalEmployeeRoleTag('threat-analyst')] },
      },
      'threat-analyst',
    )

    expect(query).toHaveBeenCalledWith(
      expect.objectContaining({
        Pagination: expect.objectContaining({ Page: 1, Limit: 100 }),
        Filter: undefined,
      }),
    )
    expect(response.Data.map((agent) => agent.Id)).toEqual([1])
    expect(response.Total).toBe(1)
  })
})

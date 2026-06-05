import { describe, expect, it } from 'vitest'
import {
  GetMCPToolListResponse,
  isMCPTierActive,
  isMCPToolVisibleForTiers,
  MCPToolConfig,
  MCPToolSource,
  resolveMCPToolListSourceFilter,
} from '@/pages/ai-agent/type/aiMCP'
import {
  normalizeGetMCPToolListResponse,
  normalizeMCPToolConfig,
  normalizeMCPToolParam,
} from '@/pages/ai-agent/aiMCP/mcpToolNormalize'

const makeTool = (overrides: Partial<MCPToolConfig> = {}): MCPToolConfig => ({
  ID: 1,
  ToolName: 'port_scan',
  Source: 'builtin',
  ServerName: '',
  Enable: true,
  Description: 'scan ports',
  Params: [],
  ...overrides,
})

describe('MCP tier visibility', () => {
  it('shows legacy tools only when legacy tier is enabled', () => {
    const tool = makeTool({ Source: 'builtin' })
    expect(isMCPToolVisibleForTiers(tool, true, false, false)).toBe(true)
    expect(isMCPToolVisibleForTiers(tool, false, true, false)).toBe(false)
    expect(isMCPToolVisibleForTiers(tool, false, false, false)).toBe(false)
  })

  it('shows aitool tools only when AI framework tier is enabled', () => {
    const aitool = makeTool({ Source: 'aitool', ToolName: 'now' })
    expect(isMCPToolVisibleForTiers(aitool, false, true, false)).toBe(true)
    expect(isMCPToolVisibleForTiers(aitool, true, false, false)).toBe(false)
    expect(isMCPToolVisibleForTiers(aitool, false, false, true)).toBe(false)
  })

  it('shows bridge tools only when bridge tier is enabled', () => {
    const bridge = makeTool({ Source: 'bridge', ToolName: 'mcp_srv_alpha', ServerName: 'srv' })
    expect(isMCPToolVisibleForTiers(bridge, false, false, true)).toBe(true)
    expect(isMCPToolVisibleForTiers(bridge, false, true, false)).toBe(false)
    expect(isMCPToolVisibleForTiers(bridge, true, false, false)).toBe(false)
  })

  it('filters display list the same way backend tiers are expected to work', () => {
    const tools: MCPToolConfig[] = [
      makeTool({ ToolName: 'port_scan', Source: 'builtin' }),
      makeTool({ ToolName: 'now', Source: 'aitool' }),
      makeTool({ ToolName: 'mcp_srv_alpha', Source: 'bridge', ServerName: 'srv' }),
    ]

    const legacyOnly = tools.filter((tool) => isMCPToolVisibleForTiers(tool, true, false, false))
    expect(legacyOnly.map((item) => item.ToolName)).toEqual(['port_scan'])

    const aiOnly = tools.filter((tool) => isMCPToolVisibleForTiers(tool, false, true, false))
    expect(aiOnly.map((item) => item.ToolName)).toEqual(['now'])

    const bridgeOnly = tools.filter((tool) => isMCPToolVisibleForTiers(tool, false, false, true))
    expect(bridgeOnly.map((item) => item.ToolName)).toEqual(['mcp_srv_alpha'])

    const all = tools.filter((tool) => isMCPToolVisibleForTiers(tool, true, true, true))
    expect(all).toHaveLength(3)
  })

  it('resolves single-source list filters for pagination', () => {
    expect(
      resolveMCPToolListSourceFilter({
        enableLegacyMcpTools: true,
        enableAIToolFramework: false,
        enableBridgeExternalMcp: false,
      }),
    ).toBe('builtin')
    expect(
      resolveMCPToolListSourceFilter({
        enableLegacyMcpTools: false,
        enableAIToolFramework: false,
        enableBridgeExternalMcp: true,
      }),
    ).toBe('bridge')
    expect(
      resolveMCPToolListSourceFilter({
        enableLegacyMcpTools: true,
        enableAIToolFramework: true,
        enableBridgeExternalMcp: false,
      }),
    ).toBe('')
  })

  it('treats bridge-only mode as an active tier', () => {
    expect(
      isMCPTierActive({
        enableLegacyMcpTools: false,
        enableAIToolFramework: false,
        enableBridgeExternalMcp: true,
      }),
    ).toBe(true)
  })
})

describe('MCP tool param normalization', () => {
  it('normalizes grpc-style PascalCase params', () => {
    const param = normalizeMCPToolParam({
      Name: 'host',
      Type: 'string',
      Description: 'target host',
      Required: true,
    })
    expect(param).toEqual({
      Name: 'host',
      Type: 'string',
      Description: 'target host',
      Default: '',
      Required: true,
    })
  })

  it('normalizes compact JSON cache params', () => {
    const param = normalizeMCPToolParam({
      name: 'query',
      type: 'string',
      description: 'search query',
      required: true,
    })
    expect(param?.Required).toBe(true)
    expect(param?.Name).toBe('query')
  })
})

describe('GetMCPToolList response normalization', () => {
  it('matches backend source separation contract', () => {
    const res = normalizeGetMCPToolListResponse({
      Tools: [
        makeTool({
          ToolName: 'port_scan',
          Source: 'builtin' as MCPToolSource,
          Params: [{ Name: 'target', Type: 'string', Description: '', Default: '', Required: false }],
        }),
        {
          ...makeTool({ ToolName: 'now', Source: 'aitool' }),
          Params: [{ name: 'timezone', type: 'string', description: 'tz', required: false }],
        },
      ],
      Pagination: { Page: 1, Limit: 20, Order: 'desc', OrderBy: 'created_at' },
      Total: 2,
    } as GetMCPToolListResponse)

    expect(res.Tools[0].Source).toBe('builtin')
    expect(res.Tools[1].Source).toBe('aitool')
    expect(res.Tools[1].Params[0].Name).toBe('timezone')
    expect(res.Tools[1].Params[0].Required).toBe(false)
  })

  it('keeps per-tool enable flags intact for startup filtering', () => {
    const tool = normalizeMCPToolConfig(
      makeTool({
        ToolName: 'port_scan',
        Enable: false,
      }),
    )
    expect(tool.Enable).toBe(false)
  })
})

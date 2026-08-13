import type { AIOutputI18n } from '@/pages/ai-re-act/hooks/grpcApi'
import type {
  GetMCPToolListResponse,
  MCPServer,
  MCPServerTool,
  MCPServerToolParamInfo,
  MCPToolConfig,
} from '../type/aiMCP'

const normalizeRequired = (value: unknown): boolean => {
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') return value === 'true' || value === 'required'
  return !!value
}

export const normalizeMCPToolParam = (raw: unknown): MCPServerToolParamInfo | null => {
  if (!raw || typeof raw !== 'object') return null
  const record = raw as Record<string, unknown>
  const name = record.Name ?? record.name
  if (typeof name !== 'string' || !name) return null
  return {
    Name: name,
    Type: String(record.Type ?? record.type ?? ''),
    Description: String(record.Description ?? record.description ?? ''),
    Default: String(record.Default ?? record.default ?? ''),
    Required: normalizeRequired(record.Required ?? record.required),
  }
}

export const normalizeMCPToolParams = (params: unknown): MCPServerToolParamInfo[] => {
  if (!Array.isArray(params)) return []
  return params.map(normalizeMCPToolParam).filter((item): item is MCPServerToolParamInfo => item !== null)
}

/** Normalize engine ypb.I18n into AIOutputI18n (same shape as NodeIdVerbose). */
const normalizeAIOutputI18n = (raw: unknown): AIOutputI18n | undefined => {
  if (!raw || typeof raw !== 'object') return undefined
  const record = raw as Record<string, unknown>
  const zh = String(record.Zh ?? record.zh ?? '').trim()
  const en = String(record.En ?? record.en ?? '').trim()
  if (!zh && !en) return undefined
  return { Zh: zh || en, En: en || zh }
}

/** Resolve locale-aware UI label for MCP tool description. */
export const resolveMCPToolDescriptionLabel = (
  tool: Pick<MCPToolConfig, 'Description' | 'DescriptionI18n'>,
  getLabelByParams: (value: AIOutputI18n) => string,
): string => {
  if (tool.DescriptionI18n) {
    const label = getLabelByParams(tool.DescriptionI18n).trim()
    if (label) return label
  }
  return String(tool.Description || '').trim()
}

export const normalizeMCPToolConfig = (tool: MCPToolConfig): MCPToolConfig => {
  const raw = tool as MCPToolConfig & Record<string, unknown>
  const description = String(tool.Description ?? raw.description ?? '')
  return {
    ...tool,
    Description: description,
    DescriptionI18n: normalizeAIOutputI18n(tool.DescriptionI18n ?? raw.DescriptionI18n),
    Params: normalizeMCPToolParams(tool.Params),
  }
}

export const normalizeGetMCPToolListResponse = (res: GetMCPToolListResponse): GetMCPToolListResponse => ({
  ...res,
  Tools: (res.Tools || []).map(normalizeMCPToolConfig),
})

const normalizeMCPServerTool = (tool: MCPServerTool): MCPServerTool => ({
  ...tool,
  Params: normalizeMCPToolParams(tool.Params),
})

export const normalizeMCPServer = (server: MCPServer): MCPServer => ({
  ...server,
  Tools: (server.Tools || []).map(normalizeMCPServerTool),
})

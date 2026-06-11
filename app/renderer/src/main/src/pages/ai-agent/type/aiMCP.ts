import { KVPair } from '@/models/kv'
import { PaginationSchema } from '@/pages/invoker/schema'
import { AIMCPServerTypeEnum } from '../defaultConstant'

export interface GetAllMCPServersRequest {
  Keyword: string
  ID?: number
  Pagination: PaginationSchema
  IsShowToolList: boolean
}

export interface GetAllMCPServersResponse {
  MCPServers: MCPServer[]
  Pagination: PaginationSchema
  Total: number
}
export interface MCPServer {
  ID: number
  Name: string
  Type: MCPServerType
  URL: string
  Command: string
  Enable: boolean
  Tools: MCPServerTool[]
  ErrorMsg: string
  Envs: KVPair[]
  Headers: KVPair[]
}

export interface MCPServerTool {
  Name: string
  Description: string
  Params: MCPServerToolParamInfo[]
}
export interface MCPServerToolParamInfo {
  Type: string
  Description: string
  Default: string
  Required: boolean
  Name: string
}

export interface UpdateMCPServerRequest {
  ID: number
  Name: string
  Type: MCPServerType
  URL: string
  Command: string
  Enable: boolean
  Envs: KVPair[]
  Headers: KVPair[]
}
export interface MCPServerFormData {
  Name: string
  Type: string
  URL: string
  Command: string
}

export interface AddMCPServerRequest {
  Name: string
  Type: MCPServerType
  URL: string
  Command: string
  Enable: boolean
  Envs: KVPair[]
  Headers: KVPair[]
}

export interface DeleteMCPServerRequest {
  ID: number
}

export type MCPServerType = `${AIMCPServerTypeEnum}`

export type MCPToolSource = 'builtin' | 'aitool' | 'bridge'

export interface MCPTierVisibility {
  enableLegacyMcpTools: boolean
  enableAIToolFramework: boolean
  enableBridgeExternalMcp: boolean
}

export const isMCPTierActive = (tiers: MCPTierVisibility) => {
  return tiers.enableLegacyMcpTools || tiers.enableAIToolFramework || tiers.enableBridgeExternalMcp
}

/** Comma-separated source values for GetMCPToolListRequest.Source; empty string means no filter. */
export const resolveMCPToolListSourceFilter = (tiers: MCPTierVisibility): string => {
  const sources: MCPToolSource[] = []
  if (tiers.enableLegacyMcpTools) sources.push('builtin')
  if (tiers.enableAIToolFramework) sources.push('aitool')
  if (tiers.enableBridgeExternalMcp) sources.push('bridge')
  return sources.join(',')
}

export const hasMultipleMCPToolSources = (tiers: MCPTierVisibility): boolean => {
  return resolveMCPToolListSourceFilter(tiers).includes(',')
}

// ---- MCP Tool-level enable/disable management ----
export interface MCPToolConfig {
  ID: number
  /** Canonical tool name, e.g. "port_scan" or "mcp_IDA-MCP_decompile" */
  ToolName: string
  /** "builtin" (legacy MCP) | "aitool" (AI framework builtin) | "bridge" (external MCP) */
  Source: MCPToolSource
  /** Non-empty only for bridge tools */
  ServerName: string
  Enable: boolean
  Description: string
  Params: MCPServerToolParamInfo[]
}

export interface GetMCPToolListRequest {
  /** Fuzzy filter by tool name or description */
  Keyword: string
  /** Single source, comma-separated sources (e.g. "builtin,aitool"), or "" (all) */
  Source: string
  /** Filter bridge tools by origin server name */
  ServerName: string
  /** When true, return only enabled tools */
  OnlyEnabled: boolean
  Pagination: PaginationSchema
  /** When true, reconcile tools against all enabled external MCP servers */
  ForceSync?: boolean
}

export interface GetMCPToolListResponse {
  Tools: MCPToolConfig[]
  Pagination: PaginationSchema
  Total: number
}

export interface SetMCPToolEnabledRequest {
  ToolName: string
  Enable: boolean
}

export interface GetMCPToolDetailRequest {
  ToolName: string
}

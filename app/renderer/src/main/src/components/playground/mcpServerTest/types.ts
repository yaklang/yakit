// MCP Server 相关类型定义

export interface MCPServerToolParamInfo {
    Type: string
    Description: string
    Default: string
    Required: string
    Name: string
}

export interface MCPServerTool {
    Name: string
    Description: string
    Params: MCPServerToolParamInfo[]
}

export interface MCPServer {
    ID: number
    Name: string
    Type: string
    URL: string
    Command: string
    Tools: MCPServerTool[]
}

export interface MCPServerFormData {
    Name: string
    Type: string
    URL: string
    Command: string
}

export interface AddMCPServerRequest {
    Name: string
    Type: string
    URL: string
    Command: string
}

export interface DeleteMCPServerRequest {
    ID: number
}

export interface UpdateMCPServerRequest {
    ID: number
    Name: string
    Type: string
    URL: string
    Command: string
}

export interface GetAllMCPServersRequest {
    Keyword?: string
    ID?: number
    Pagination?: Pagination
    IsShowToolList?: boolean
}

export interface GetAllMCPServersResponse {
    MCPServers: MCPServer[]
    Pagination: Pagination
    Total: number
}

export interface Pagination {
    Page: number
    Limit: number
    OrderBy?: string
    Order?: "asc" | "desc"
}

export interface MCPServerListProps {
    selectedServerId?: number
    onSelectServer: (server: MCPServer) => void
    onRefresh: () => void
}

export interface MCPServerDetailProps {
    server?: MCPServer
    onRefresh: () => void
}


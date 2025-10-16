import {PaginationSchema} from "@/pages/invoker/schema"

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
    Required: string
    Name: string
}

export interface UpdateMCPServerRequest {
    ID: number
    Name: string
    Type: MCPServerType
    URL: string
    Command: string
    Enable: boolean
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
}

export interface DeleteMCPServerRequest {
    ID: number
}

export type MCPServerType = "sse" | "stdio"

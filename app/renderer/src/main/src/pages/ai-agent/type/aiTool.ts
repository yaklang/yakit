import {PaginationSchema} from "@/pages/invoker/schema"

export interface AITool {
    Name: string
    Description: string
    Content: string
    ToolPath: string
    Keywords: string[]
    IsFavorite: boolean
    ID: number
    VerboseName: string
}
export interface GetAIToolListRequest {
    Query: string
    ToolName: string
    Pagination: PaginationSchema
    OnlyFavorites: boolean
    ToolID?: number
}
export interface GetAIToolListResponse {
    Tools: AITool[]
    Pagination: PaginationSchema
    Total: number
}
export interface ToggleAIToolFavoriteRequest {
    /**@deprecated */
    ToolName?: string
    ID: number
}
export interface ToggleAIToolFavoriteResponse {
    IsFavorite: boolean
    Message: string
}
export interface SaveAIToolRequest {
    Name: string
    Description: string
    Content: string
    ToolPath: string
    Keywords: string[]
}
export interface SaveAIToolV2Response {
    IsSuccess: boolean
    Message: string
    AITool: AITool
}
export interface UpdateAIToolRequest extends SaveAIToolRequest {
    ID: number
}
export interface DeleteAIToolRequest {
    /**@deprecated */
    ToolNames?: string
    IDs: number[]
}
export interface AIToolGenerateMetadataRequest {
    ToolName: string
    Content: string
}
export interface AIToolGenerateMetadataResponse {
    Name: string
    Description: string
    Keywords: string[]
}

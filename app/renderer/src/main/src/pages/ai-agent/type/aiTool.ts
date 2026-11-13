import type { PaginationSchema } from '@/pages/invoker/schema'
import type { AIOutputI18n } from '@/pages/ai-re-act/hooks/grpcApi'

export interface AITool {
  Name: string
  Description: string
  Content: string
  ToolPath: string
  Keywords: string[]
  IsFavorite: boolean
  ID: number
  VerboseName: string
  VerboseNameI18n?: AIOutputI18n
  UpdatedAt: number
  CreatedAt: number
  IsBuiltin: boolean
  Author: string
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
export interface QueryAIToolRequest {
  Filter?: {
    ToolName?: string
    ToolNames?: string[]
    Keyword?: string
    OnlyFavorites?: boolean
    ID?: number
    IDs?: number[]
  }
  Pagination: PaginationSchema
}
export interface QueryAIToolResponse {
  Data: AITool[]
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

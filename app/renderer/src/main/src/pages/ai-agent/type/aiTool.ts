import type { PaginationSchema } from '@/pages/invoker/schema'

export interface AITool {
  Name: string
  Description: string
  Content: string
  ToolPath: string
  Keywords: string[]
  IsFavorite: boolean
  ID: string | number
  VerboseName: string
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
  ToolID?: string | number
}
export interface GetAIToolListResponse {
  Tools: AITool[]
  Pagination: PaginationSchema
  Total: number
}
export interface ToggleAIToolFavoriteRequest {
  /**@deprecated */
  ToolName?: string
  ID: string | number
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
  ID: string | number
}
export interface DeleteAIToolRequest {
  /**@deprecated */
  ToolNames?: string
  IDs: (string | number)[]
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

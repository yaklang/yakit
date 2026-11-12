import type { PaginationSchema } from '@/pages/invoker/schema'
import type { KnowledgeBaseItem } from '@/pages/KnowledgeBase/hooks/useKnowledgeBase'

export interface AISessionTaskResourceInfo {
  Type: string
  Key: string
  Value: string
  Scope: string
  Source: string
}

export interface GetAISessionCurrentResourcesRequest {
  SessionID: string
}

export interface GetAISessionCurrentResourcesResponse {
  SessionID: string
  TaskID: string
  UserInputUUID: string
  TaskResources: AISessionTaskResourceInfo[]
  SessionResources: AISessionTaskResourceInfo[]
}

export interface QueryKnowledgeBaseRequest {
  Filter?: {
    IDs?: number[]
    Names?: string[]
    Keyword?: string
    Types?: string[]
    Tags?: string[]
  }
  Pagination: PaginationSchema
}

export interface QueryKnowledgeBaseResponse {
  Data: KnowledgeBaseItem[]
  Pagination: PaginationSchema
  Total: number
}

import { YakURLResource } from '@/pages/yakURLTree/data'

export interface OpenAPIDocumentInfo {
  docId: string
  title: string
  version: string
  specVersion: string
  domain: string
  isHttps: boolean
  operationCount: number
  parseWarnings?: string[]
}

export interface OpenAPIOperationParameter {
  name: string
  in: string
  required?: boolean
  type?: string
  description?: string
  example?: string | number | boolean
  schemaJson?: string
}

export interface OpenAPIOperationRequestBody {
  required?: boolean
  description?: string
  content?: Record<string, string>
}

export interface OpenAPIOperationResponse {
  statusCode: string
  description?: string
  exampleJson?: string
}

export interface OpenAPIOperationDetail {
  path: string
  method: string
  operationId?: string
  summary?: string
  description?: string
  tags?: string[]
  deprecated?: boolean
  parameters?: OpenAPIOperationParameter[]
  requestBody?: OpenAPIOperationRequestBody
  responses?: OpenAPIOperationResponse[]
}

export interface OpenAPITreeNode {
  key: string
  title: string
  isLeaf: boolean
  children?: OpenAPITreeNode[]
  operation?: OpenAPIOperationSummary
}

export interface OpenAPIOperationSummary {
  method: string
  path: string
  operationId?: string
  summary?: string
  tags?: string[]
  resource: YakURLResource
}

export interface OpenAPIDocState {
  docId: string
  docInfo?: OpenAPIDocumentInfo
  operations: OpenAPIOperationSummary[]
  selectedOperation?: OpenAPIOperationSummary
  operationDetail?: OpenAPIOperationDetail
  parameterValues: Record<string, string>
  overrideDomain: string
  overrideIsHttps: boolean
  requestRaw: string
  responseRaw: string
  isHttps: boolean
  loading: boolean
  sending: boolean
  parseWarnings: string[]
}

export const initialOpenAPIDocState = (): OpenAPIDocState => ({
  docId: '',
  operations: [],
  parameterValues: {},
  overrideDomain: '',
  overrideIsHttps: false,
  requestRaw: '',
  responseRaw: '',
  isHttps: false,
  loading: false,
  sending: false,
  parseWarnings: [],
})

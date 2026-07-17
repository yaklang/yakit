import { RequestYakURLResponse, YakURLResource } from '@/pages/yakURLTree/data'
import { StringToUint8Array } from '@/utils/str'

const { ipcRenderer } = window.require('electron')

type YakQueryItem = { Key: string; Value: string }

export interface ApiDocInfo {
  docId: string
  title: string
  version: string
  specVersion: string
  domain: string
  isHttps: boolean
  operationCount: number
  parseWarnings?: string[]
}

export interface ApiDocHistoryItem {
  sessionId: string
  title: string
  fileName?: string
  createdAt: number
  updatedAt: number
  lastUsedAt: number
}

export interface ApiDocOperationParameter {
  name: string
  in: string
  required?: boolean
  type?: string
  description?: string
  example?: string | number | boolean
  schemaJson?: string
}

export interface ApiDocOperationResponse {
  statusCode: string
  description?: string
  exampleJson?: string
}

export interface ApiDocOperationDetail {
  path: string
  method: string
  operationId?: string
  summary?: string
  description?: string
  tags?: string[]
  deprecated?: boolean
  parameters?: ApiDocOperationParameter[]
  requestBody?: { required?: boolean; description?: string; content?: Record<string, string> }
  responses?: ApiDocOperationResponse[]
}

export interface ApiDocOperationSummary {
  method: string
  path: string
  operationId?: string
  summary?: string
  tags?: string[]
}

export interface OpenAPIParseProgress {
  task_id: string
  percent?: number
  stage?: string
  message?: string
  current?: number
  total?: number
}

export const getExtra = (extra: YakURLResource['Extra'] | undefined, key: string) =>
  extra?.find((item) => item.Key === key)?.Value || ''

export const toNumber = (value: string, fallback = 0) => {
  const num = Number(value)
  return Number.isFinite(num) ? num : fallback
}

const METHOD_TAG_BG: Record<string, string> = {
  GET: '#61affe',
  POST: '#49cc90',
  PUT: '#fca130',
  DELETE: '#f93e3e',
  PATCH: '#50e3c2',
  HEAD: '#9012fe',
  OPTIONS: '#0d5aa7',
  TRACE: '#999',
  CONNECT: '#333',
}

export const getApiMethodTagStyle = (method: string) => ({
  background: METHOD_TAG_BG[method.toUpperCase()] || '#999',
  color: '#fff',
  borderColor: 'transparent',
})

const buildUrl = (location: string, query: YakQueryItem[] = []) => ({
  Schema: 'openapi',
  Location: location,
  Path: '/',
  Query: query,
})

export const openApiRequest = async (
  method: string,
  location: string,
  query: YakQueryItem[] = [],
  body?: string,
  token?: string,
) => {
  const resp = (await ipcRenderer.invoke(
    'RequestYakURL',
    {
      Method: method,
      Url: buildUrl(location, query),
      Body: body === undefined ? undefined : StringToUint8Array(body),
    },
    token,
  )) as RequestYakURLResponse
  return resp.Resources || []
}

export const cancelOpenApiRequest = async (token?: string) => {
  if (!token) return
  try {
    await ipcRenderer.invoke('cancel-RequestYakURL', token)
  } catch {}
}

export const isOpenApiRequestCanceled = (error: unknown) => {
  const { code, details, message } = (error || {}) as Record<string, unknown>
  return (
    code === 1 ||
    String(details || message || error)
      .toLowerCase()
      .includes('cancel')
  )
}

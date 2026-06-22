import { RequestYakURLResponse, YakURLResource } from '@/pages/yakURLTree/data'
import { StringToUint8Array } from '@/utils/str'
import {
  OpenAPIDocumentHistoryItem,
  OpenAPIDocumentInfo,
  OpenAPIOperationDetail,
  OpenAPIOperationSummary,
} from './openapiDocType'

const { ipcRenderer } = window.require('electron')

function getExtraValue(extra: YakURLResource['Extra'], key: string): string {
  return extra?.find((item) => item.Key === key)?.Value || ''
}

function parseOperationSummary(resource: YakURLResource): OpenAPIOperationSummary {
  const extra = resource.Extra || []
  const tagsRaw = getExtraValue(extra, 'tags')
  return {
    method: getExtraValue(extra, 'method'),
    path: getExtraValue(extra, 'path'),
    operationId: getExtraValue(extra, 'operationId'),
    summary: getExtraValue(extra, 'summary') || resource.VerboseName,
    tags: tagsRaw ? tagsRaw.split(',').filter(Boolean) : [],
    resource,
  }
}

function parseDocumentInfo(docId: string, resource: YakURLResource): OpenAPIDocumentInfo {
  const extra = resource.Extra || []
  let parseWarnings: string[] = []
  const warningsRaw = getExtraValue(extra, 'parse_warnings')
  if (warningsRaw) {
    try {
      parseWarnings = JSON.parse(warningsRaw)
    } catch (_) {}
  }
  return {
    docId,
    title: getExtraValue(extra, 'title') || resource.VerboseName,
    version: getExtraValue(extra, 'version'),
    specVersion: getExtraValue(extra, 'specVersion'),
    domain: getExtraValue(extra, 'domain'),
    isHttps: getExtraValue(extra, 'is_https') === 'true',
    operationCount: Number(getExtraValue(extra, 'operation_count') || '0'),
    parseWarnings,
  }
}

async function requestYakURL(method: string, url: Record<string, unknown>, body?: string | Uint8Array) {
  return ipcRenderer.invoke('RequestYakURL', {
    Method: method,
    Url: url,
    Body: body === undefined ? undefined : typeof body === 'string' ? StringToUint8Array(body) : body,
  }) as Promise<RequestYakURLResponse>
}

/** POST openapi://upload/ 上传 Swagger / OpenAPI 文档 */
export async function uploadOpenAPIDocument(
  content: string,
  options?: { fileName?: string; overrideDomain?: string; overrideIsHttps?: boolean },
) {
  const query: { Key: string; Value: string }[] = []
  if (options?.fileName) {
    query.push({ Key: 'fileName', Value: options.fileName })
  }
  if (options?.overrideDomain) {
    query.push({ Key: 'overrideDomain', Value: options.overrideDomain })
  }
  if (options?.overrideIsHttps) {
    query.push({ Key: 'overrideIsHttps', Value: 'true' })
  }
  const resp = await requestYakURL(
    'POST',
    {
      Schema: 'openapi',
      Location: 'upload',
      Path: '/',
      Query: query,
    },
    content,
  )
  const resources = resp.Resources || []
  if (!resources.length) {
    throw new Error('upload openapi document failed: empty response')
  }
  const docResource = resources.find((item) => item.ResourceType === 'openapi-document') || resources[0]
  const docId = docResource.ResourceName
  const docInfo = parseDocumentInfo(docId, docResource)
  const operations = resources.filter((item) => item.ResourceType === 'openapi-operation').map(parseOperationSummary)
  return { docId, docInfo, operations }
}

function parseDocumentHistoryItem(resource: YakURLResource): OpenAPIDocumentHistoryItem {
  const extra = resource.Extra || []
  const sessionId = getExtraValue(extra, 'session_id') || resource.ResourceName
  const createdAt = Number(getExtraValue(extra, 'created_at') || getExtraValue(extra, 'uploaded_at') || '0')
  const updatedAt = Number(getExtraValue(extra, 'updated_at') || createdAt || '0')
  const lastUsedAt = Number(getExtraValue(extra, 'last_used_at') || updatedAt || createdAt || '0')
  const title = getExtraValue(extra, 'title') || resource.VerboseName
  return {
    sessionId,
    docId: sessionId,
    title,
    fileName: getExtraValue(extra, 'file_name') || undefined,
    source: getExtraValue(extra, 'source') || undefined,
    createdAt,
    updatedAt,
    lastUsedAt,
    uploadedAt: createdAt,
    operationCount: Number(getExtraValue(extra, 'operation_count') || '0'),
    specVersion: getExtraValue(extra, 'specVersion') || undefined,
    version: getExtraValue(extra, 'version') || undefined,
  }
}

export function getOpenAPIDocumentHistoryTitle(item: OpenAPIDocumentHistoryItem) {
  return item.fileName || item.title || item.sessionId
}

export function getOpenAPIDocumentHistoryTimestamp(item: OpenAPIDocumentHistoryItem) {
  return item.lastUsedAt || item.updatedAt || item.createdAt
}

/** GET openapi://history/ 获取已上传文档历史（持久化目录） */
export async function listOpenAPIDocumentHistory(): Promise<OpenAPIDocumentHistoryItem[]> {
  const resp = await requestYakURL('GET', {
    Schema: 'openapi',
    Location: 'history',
    Path: '/',
    Query: [],
  })
  return (resp.Resources || []).filter((item) => item.ResourceType === 'openapi-document').map(parseDocumentHistoryItem)
}

/** DELETE openapi://{docId}/ 删除文档及磁盘文件 */
export async function deleteOpenAPIDocument(docId: string) {
  await requestYakURL('DELETE', {
    Schema: 'openapi',
    Location: docId,
    Path: '/',
    Query: [],
  })
}

/** GET openapi://{docId}/ 加载指定文档 */
export async function loadOpenAPIDocumentById(docId: string) {
  const result = await listOpenAPIDocument(docId)
  if (!result.docInfo) {
    throw new Error('openapi document not found')
  }
  return {
    docId,
    docInfo: result.docInfo,
    operations: result.operations,
  }
}

/** GET openapi://{docId}/ 刷新文档与接口列表 */
export async function listOpenAPIDocument(docId: string) {
  const resp = await requestYakURL('GET', {
    Schema: 'openapi',
    Location: docId,
    Path: '/',
    Query: [],
  })
  const resources = resp.Resources || []
  const docResource = resources.find((item) => item.ResourceType === 'openapi-document')
  const operations = resources.filter((item) => item.ResourceType === 'openapi-operation').map(parseOperationSummary)
  return {
    docInfo: docResource ? parseDocumentInfo(docId, docResource) : undefined,
    operations,
  }
}

/** GET openapi://{docId}/?op=detail&method=&path= 获取接口详情 */
export async function getOpenAPIOperationDetail(
  docId: string,
  method: string,
  path: string,
): Promise<OpenAPIOperationDetail> {
  const resp = await requestYakURL('GET', {
    Schema: 'openapi',
    Location: docId,
    Path: '/',
    Query: [
      { Key: 'op', Value: 'detail' },
      { Key: 'method', Value: method.toUpperCase() },
      { Key: 'path', Value: path },
    ],
  })
  const resource = resp.Resources?.[0]
  const detailJSON = getExtraValue(resource?.Extra || [], 'detail_json')
  if (!detailJSON) {
    throw new Error('operation detail is empty')
  }
  const raw = JSON.parse(detailJSON)
  return {
    path: raw.path,
    method: raw.method,
    operationId: raw.operationId,
    summary: raw.summary,
    description: raw.description,
    tags: raw.tags,
    deprecated: raw.deprecated,
    parameters: raw.parameters,
    requestBody: raw.requestBody,
    responses: raw.responses,
  }
}

export interface BuildOpenAPIRequestOptions {
  overrideDomain?: string
  overrideIsHttps?: boolean
  requestBodyContentType?: string
  parameterValues?: Record<string, string>
}

/** POST openapi://{docId}/?op=build 构造 Fuzzer 请求包 */
export async function buildOpenAPIOperationRequest(
  docId: string,
  method: string,
  path: string,
  options?: BuildOpenAPIRequestOptions,
) {
  const query: { Key: string; Value: string }[] = [
    { Key: 'op', Value: 'build' },
    { Key: 'method', Value: method.toUpperCase() },
    { Key: 'path', Value: path },
  ]
  if (options?.overrideDomain) {
    query.push({ Key: 'overrideDomain', Value: options.overrideDomain })
  }
  if (options?.overrideIsHttps) {
    query.push({ Key: 'overrideIsHttps', Value: 'true' })
  }
  if (options?.requestBodyContentType) {
    query.push({ Key: 'requestBodyContentType', Value: options.requestBodyContentType })
  }
  const resp = await requestYakURL(
    'POST',
    {
      Schema: 'openapi',
      Location: docId,
      Path: '/',
      Query: query,
    },
    JSON.stringify({
      overrideDomain: options?.overrideDomain,
      overrideIsHttps: options?.overrideIsHttps,
      requestBodyContentType: options?.requestBodyContentType,
      parameterValues: options?.parameterValues || {},
    }),
  )
  const resource = resp.Resources?.[0]
  if (!resource) {
    throw new Error('build request failed: empty response')
  }
  const request = getExtraValue(resource.Extra || [], 'request')
  const isHttps = getExtraValue(resource.Extra || [], 'is_https') === 'true'
  return { request, isHttps }
}

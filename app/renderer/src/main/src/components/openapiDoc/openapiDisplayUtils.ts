import { OpenAPIOperationResponse } from './openapiDocType'

/** responses key 合法值：HTTP 100-599 或 OpenAPI 保留字 default */
export function isValidResponseStatusCode(code: string): boolean {
  const normalized = code.trim()
  if (normalized === 'default') {
    return true
  }
  if (!/^\d{3}$/.test(normalized)) {
    return false
  }
  const n = Number(normalized)
  return n >= 100 && n <= 599
}

export function filterDisplayResponses(responses: OpenAPIOperationResponse[] | undefined): OpenAPIOperationResponse[] {
  return (responses || []).filter((item) => isValidResponseStatusCode(item.statusCode))
}

export function formatResponseStatusLabel(code: string, t: (key: string) => string): string {
  if (code.trim() === 'default') {
    return t('HTTPHistory.openapiDoc.defaultResponse')
  }
  return code
}

export interface BrowserHTTPTestResult {
  browserRef: string
  url: string
  statusCode: number
  requestTransformed: boolean
  responseTransformed: boolean
  requestTransformEnabled: boolean
  responseTransformEnabled: boolean
  plaintextRequest: { raw: string; truncated: boolean }
  wireRequest: { raw: string; truncated: boolean }
  wireResponse: { raw: string; truncated: boolean }
  plaintextResponse: { raw: string; truncated: boolean }
}

const packet = (value: unknown): value is BrowserHTTPTestResult['plaintextRequest'] => {
  if (!value || typeof value !== 'object') return false
  const data = value as Record<string, unknown>
  return typeof data.raw === 'string' && typeof data.truncated === 'boolean'
}

export const parseBrowserHTTPTestResult = (executionResult: unknown): BrowserHTTPTestResult | undefined => {
  if (!executionResult || typeof executionResult !== 'object') return undefined
  const envelope = executionResult as Record<string, unknown>
  if (!('result' in envelope) || !envelope.result || typeof envelope.result !== 'object') return undefined
  const data = envelope.result as Record<string, unknown>
  if (
    !packet(data.plaintextRequest) ||
    !packet(data.wireRequest) ||
    !packet(data.wireResponse) ||
    !packet(data.plaintextResponse)
  ) {
    return undefined
  }
  return {
    browserRef: typeof data.browserRef === 'string' ? data.browserRef : '',
    url: typeof data.url === 'string' ? data.url : '',
    statusCode: typeof data.statusCode === 'number' ? data.statusCode : 0,
    requestTransformed: data.requestTransformed === true,
    responseTransformed: data.responseTransformed === true,
    requestTransformEnabled: data.requestTransformEnabled === true,
    responseTransformEnabled: data.responseTransformEnabled === true,
    plaintextRequest: data.plaintextRequest,
    wireRequest: data.wireRequest,
    wireResponse: data.wireResponse,
    plaintextResponse: data.plaintextResponse,
  }
}

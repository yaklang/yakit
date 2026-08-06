import type { RecordingEvent, RunBrowserCapability } from './BrowserRecordingWorkspace'

export type DirectionName = 'request' | 'response'
export type ValueEncoding = 'auto' | 'text' | 'json' | 'base64'
export type BuiltinOperation =
  | 'value.literal'
  | 'json.stringify'
  | 'json.parse'
  | 'text.toString'
  | 'url.encode'
  | 'url.decode'
  | 'base64.encode'
  | 'base64.decode'
  | 'hex.encode'
  | 'hex.decode'
  | 'object.pick'
  | 'object.compose'
  | 'form.compose'
  | 'form.serialize'

export interface BrowserTab {
  id: number
  title: string
  url: string
}

export interface PageCallableInputSlot {
  id: string
  name: string
  index: number
  role: string
  dataType: string
  retained: boolean
}

export interface TransformPageCallable {
  id: string
  name: string
  kind: 'recorded-call' | 'business-closure' | 'request-transaction' | 'global-function'
  operation: string
  algorithm?: string
  origin: string
  target: { tabId: number; frameId: number; documentId?: string }
  lifecycle: 'document'
  inputSlots: PageCallableInputSlot[]
  output?: {
    shape: 'value' | 'envelope'
    format: string
    paths: string[]
  }
  transaction?: {
    version: 2
    prerequisites: Array<{
      boundary: 'fetch'
      method: string
      url: string
      requestBodyFormat: 'none' | 'json' | 'form' | 'raw'
      maxRequestBodyBytes: number
      response: {
        statusCode: number
        url: string
        bodyFormat: 'json' | 'form' | 'raw'
        maxBodyBytes: number
        requiredPaths: string[]
      }
    }>
    request: {
      boundary: 'fetch' | 'xhr' | 'beacon' | 'form'
      method: string
      url: string
      expectedDestinations: string[]
      bodyFormat: 'json' | 'form' | 'raw'
    }
    inputMode: 'auto'
  }
  provenance: {
    recordingId?: string
    traceId?: string
    eventId?: string
    functionName?: string
    sourceUrl?: string
    lineNumber?: number
  }
}

export type PageCallable = TransformPageCallable

export interface NodeReference {
  nodeId: string
  path?: string
}

export interface PipelineNodeBase {
  id: string
  name: string
}

export type PipelineNode =
  | (PipelineNodeBase & { kind: 'context.read'; path: string })
  | (PipelineNodeBase & {
      kind: 'builtin'
      operation: BuiltinOperation
      inputs: NodeReference[]
      options?: Record<string, unknown>
    })
  | (PipelineNodeBase & { kind: 'page.call'; callableId: string; arguments: NodeReference[] })
  | (PipelineNodeBase & { kind: 'output.write'; destination: string; source: NodeReference; encoding: ValueEncoding })

export interface TransformDirection {
  enabled: boolean
  nodes: PipelineNode[]
}

export interface TransformProfile {
  id: string
  name: string
  enabled: boolean
  target: { tabId: number; frameId: number; documentId?: string }
  origin: string
  match: { methods: string[]; urlPattern: string }
  request: TransformDirection
  response: TransformDirection
  failMode: 'closed'
  maxConcurrency: number
  createdAt: number
  updatedAt: number
}

export type TransformProfileInput = Omit<TransformProfile, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }

export interface TransformExecution {
  profileId: string
  direction: DirectionName
  url: string
  bodyBase64: string
  setHeaders: Array<{ name: string; value: string }>
  removeHeaders: string[]
  logicalInput: unknown
  logicalOutput: unknown
  nodeDurations: Array<{ nodeId: string; durationMs: number }>
  durationMs: number
}

export interface BrowserTransformWorkspaceProps {
  active: boolean
  deviceId: string
  connected: boolean
  running: boolean
  selectedEvent?: RecordingEvent
  recordingTarget?: { tabId: number; frameId?: number; documentId?: string }
  runCapability: RunBrowserCapability
  onOpenDeepCapture: () => void
  suggestion?: BrowserTransformSuggestion
  validatedSuggestion?: BrowserTransformValidatedSuggestion
}

export type GuidedOutputKind = 'body' | 'json-field' | 'form-field' | 'header' | 'query'

export interface GuidedDraft {
  callableId: string
  inputPaths: string[]
  resultPath?: string
  outputKind: GuidedOutputKind
  outputField: string
  setFormContentType: boolean
}

export interface BrowserTransformSuggestion {
  revision: number
  callable: TransformPageCallable
  request: {
    method: string
    url: string
    destination?: string
    serialization?: 'raw-body' | 'json-field' | 'form-field' | 'header' | 'query'
  }
  sampleBody?: string
  sampleLabel?: string
}

export interface BrowserTransformValidatedSuggestion {
  revision: number
  draftId: string
  profile: TransformProfileInput
  proofLevel: 'execution-only' | 'structure' | 'exact'
  comparisonSummary?: string
}

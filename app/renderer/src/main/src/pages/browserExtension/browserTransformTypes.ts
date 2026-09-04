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

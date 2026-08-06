import type React from 'react'
import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react'
import {
  ApartmentOutlined,
  CheckCircleOutlined,
  CodeOutlined,
  DeleteOutlined,
  ExperimentOutlined,
  FileTextOutlined,
  PlusOutlined,
  SaveOutlined,
  ThunderboltOutlined,
  WarningOutlined,
} from '@ant-design/icons'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitInput } from '@/components/yakitUI/YakitInput/YakitInput'
import { YakitSelect } from '@/components/yakitUI/YakitSelect/YakitSelect'
import { YakitSwitch } from '@/components/yakitUI/YakitSwitch/YakitSwitch'
import { success } from '@/utils/notification'
import type { RecordingEvent } from './BrowserRecordingWorkspace'
import type {
  BrowserTab,
  BrowserTransformSuggestion,
  BrowserTransformWorkspaceProps,
  BuiltinOperation,
  GuidedDraft,
  GuidedOutputKind,
  NodeReference,
  PageCallable,
  PipelineNode,
  TransformDirection,
  TransformExecution,
  TransformPageCallable,
  TransformProfile,
  TransformProfileInput,
  ValueEncoding,
} from './browserTransformTypes'
import {
  browserTransformWorkspaceReducer,
  createBrowserTransformWorkspaceState,
  type BrowserTransformWorkspaceField,
  type BrowserTransformWorkspaceState,
} from './browserTransformWorkspaceReducer'
import { BrowserTransformProfileRail } from './BrowserTransformProfileRail'
import { BrowserTransformReplayPanel } from './BrowserTransformReplayPanel'
import { BrowserTransformExternalAdapter } from './BrowserTransformExternalAdapter'
import styles from './BrowserTransformWorkspace.module.scss'

const BUILTINS: Array<{ value: BuiltinOperation; label: string }> = [
  { value: 'value.literal', label: '固定值' },
  { value: 'json.stringify', label: 'JSON 序列化' },
  { value: 'json.parse', label: 'JSON 解析' },
  { value: 'text.toString', label: '转为文本' },
  { value: 'url.encode', label: 'URL 编码' },
  { value: 'url.decode', label: 'URL 解码' },
  { value: 'base64.encode', label: 'Base64 编码' },
  { value: 'base64.decode', label: 'Base64 解码' },
  { value: 'hex.encode', label: 'Hex 编码' },
  { value: 'hex.decode', label: 'Hex 解码' },
  { value: 'object.pick', label: '选择对象字段' },
  { value: 'object.compose', label: '组合对象' },
  { value: 'form.compose', label: '组合表单' },
  { value: 'form.serialize', label: '序列化完整表单' },
]

const ENCODINGS: Array<{ value: ValueEncoding; label: string }> = [
  { value: 'auto', label: '自动' },
  { value: 'text', label: '文本' },
  { value: 'json', label: 'JSON' },
  { value: 'base64', label: 'Base64' },
]

const isObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === 'object' && !Array.isArray(value))

function isProfile(value: unknown): value is TransformProfile {
  if (!isObject(value) || !isObject(value.target) || !isObject(value.request) || !isObject(value.response)) return false
  return (
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    Array.isArray(value.request.nodes) &&
    Array.isArray(value.response.nodes)
  )
}

function isCallable(value: unknown): value is PageCallable {
  return isObject(value) && typeof value.id === 'string' && typeof value.name === 'string'
}

function isTab(value: unknown): value is BrowserTab {
  return isObject(value) && typeof value.id === 'number' && typeof value.url === 'string'
}

function isExecution(value: unknown): value is TransformExecution {
  return (
    isObject(value) &&
    typeof value.url === 'string' &&
    typeof value.bodyBase64 === 'string' &&
    typeof value.durationMs === 'number' &&
    Array.isArray(value.nodeDurations)
  )
}

function originOf(url?: string): string {
  try {
    return url ? new URL(url).origin : ''
  } catch {
    return ''
  }
}

interface RequestRouteSource {
  url?: string
  method?: string
}

function absoluteURL(value?: string, base?: string): string {
  try {
    return value ? new URL(value, base).toString() : base || ''
  } catch {
    return value || base || ''
  }
}

function routeOf(event?: RequestRouteSource, tab?: BrowserTab): string {
  try {
    return `*${new URL(event?.url || tab?.url || '', tab?.url).pathname}`
  } catch {
    return '*'
  }
}

function uid(prefix: string): string {
  const random = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`
  return `${prefix}-${random}`
}

function emptyDirection(enabled = false): TransformDirection {
  return { enabled, nodes: [] }
}

function activeInputCount(callable?: PageCallable): number {
  if (!callable?.inputSlots) return callable ? 1 : 0
  return callable.inputSlots.filter((slot) => !slot.retained).length
}

function envelopeBodyFormat(callable?: PageCallable): 'json' | 'form' | 'raw' | undefined {
  if (callable?.output?.shape !== 'envelope') return undefined
  return callable.transaction?.request.bodyFormat || 'raw'
}

function appendContentType(nodes: PipelineNode[], contentType: string): void {
  const literalID = uid('literal')
  nodes.push({
    id: literalID,
    name: '请求 Content-Type',
    kind: 'builtin',
    operation: 'value.literal',
    inputs: [],
    options: { value: contentType },
  })
  nodes.push({
    id: uid('header'),
    name: '设置请求 Content-Type',
    kind: 'output.write',
    destination: 'header.Content-Type',
    source: { nodeId: literalID },
    encoding: 'text',
  })
}

function defaultGuide(
  callable?: PageCallable,
  output?: { outputKind?: GuidedOutputKind; outputField?: string },
): GuidedDraft {
  const bodyFormat = envelopeBodyFormat(callable)
  return {
    callableId: callable?.id || '',
    inputPaths: Array.from({ length: activeInputCount(callable) }, () => 'body'),
    outputKind: bodyFormat ? 'body' : output?.outputKind || 'body',
    outputField: bodyFormat ? '' : output?.outputField || '',
    setFormContentType: bodyFormat === 'form' || (!bodyFormat && output?.outputKind === 'form-field'),
  }
}

function compileGuide(guide: GuidedDraft, callable?: PageCallable): TransformDirection {
  const count = activeInputCount(callable)
  const paths = guide.inputPaths.slice(0, count)
  while (paths.length < count) paths.push('body')
  const inputs: PipelineNode[] = paths.map((path, index) => ({
    id: uid('input'),
    name: count > 1 ? `读取参数 ${index + 1}` : '读取明文输入',
    kind: 'context.read',
    path: path.trim() || 'body',
  }))
  const callID = uid('call')
  const callNode: PipelineNode = {
    id: callID,
    name: callable?.name || '调用页面函数',
    kind: 'page.call',
    callableId: guide.callableId,
    arguments: inputs.map((node) => ({ nodeId: node.id })),
  }
  const callReference: NodeReference = { nodeId: callID, path: guide.resultPath?.trim() || undefined }
  const nodes: PipelineNode[] = [...inputs, callNode]
  const bodyFormat = envelopeBodyFormat(callable)

  if (bodyFormat) {
    let outputReference: NodeReference = { nodeId: callID }
    if (bodyFormat === 'form') {
      const formID = uid('form')
      nodes.push({
        id: formID,
        name: '序列化完整线上表单',
        kind: 'builtin',
        operation: 'form.serialize',
        inputs: [{ nodeId: callID }],
      })
      outputReference = { nodeId: formID }
      appendContentType(nodes, 'application/x-www-form-urlencoded')
    } else if (bodyFormat === 'json') {
      appendContentType(nodes, 'application/json')
    }
    nodes.push({
      id: uid('output'),
      name: '写入完整线上请求',
      kind: 'output.write',
      destination: 'body',
      source: outputReference,
      encoding: bodyFormat === 'json' ? 'json' : bodyFormat === 'form' ? 'text' : 'auto',
    })
    return { enabled: true, nodes }
  }

  if (guide.outputKind === 'form-field') {
    const formID = uid('form')
    nodes.push({
      id: formID,
      name: `组成表单字段 ${guide.outputField.trim() || 'value'}`,
      kind: 'builtin',
      operation: 'form.compose',
      inputs: [callReference],
      options: { keys: [guide.outputField.trim()] },
    })
    if (guide.setFormContentType) appendContentType(nodes, 'application/x-www-form-urlencoded')
    nodes.push({
      id: uid('output'),
      name: '写入线上表单',
      kind: 'output.write',
      destination: 'body',
      source: { nodeId: formID },
      encoding: 'text',
    })
    return { enabled: true, nodes }
  }

  const field = guide.outputField.trim()
  const destination =
    guide.outputKind === 'body'
      ? 'body'
      : guide.outputKind === 'json-field'
        ? `body.${field}`
        : guide.outputKind === 'header'
          ? `header.${field}`
          : `query.${field}`
  nodes.push({
    id: uid('output'),
    name: guide.outputKind === 'body' ? '替换线上 Body' : `写入 ${field || '输出字段'}`,
    kind: 'output.write',
    destination,
    source: callReference,
    encoding: guide.outputKind === 'body' ? 'auto' : 'text',
  })
  return { enabled: true, nodes }
}

function parseGuide(direction: TransformDirection, callables: PageCallable[]): GuidedDraft | undefined {
  const calls = direction.nodes.filter(
    (node): node is Extract<PipelineNode, { kind: 'page.call' }> => node.kind === 'page.call',
  )
  if (calls.length !== 1) return undefined
  const call = calls[0]
  const callable = callables.find((item) => item.id === call.callableId)
  if (!callable) return undefined
  const byID = new Map(direction.nodes.map((node) => [node.id, node]))
  const inputPaths: string[] = []
  for (const reference of call.arguments) {
    const source = byID.get(reference.nodeId)
    if (!source || source.kind !== 'context.read' || reference.path) return undefined
    inputPaths.push(source.path)
  }
  const outputs = direction.nodes.filter(
    (node): node is Extract<PipelineNode, { kind: 'output.write' }> => node.kind === 'output.write',
  )
  const contentType = outputs.find((node) => node.destination.toLowerCase() === 'header.content-type')
  const bodyOutputs = outputs.filter((node) => node !== contentType)
  const form = direction.nodes.find(
    (node): node is Extract<PipelineNode, { kind: 'builtin' }> =>
      node.kind === 'builtin' && node.operation === 'form.compose',
  )
  if (form) {
    const bodyOutput = outputs.find((node) => node.destination === 'body' && node.source.nodeId === form.id)
    const keys = form.options?.keys
    if (
      !bodyOutput ||
      form.inputs.length !== 1 ||
      form.inputs[0].nodeId !== call.id ||
      !Array.isArray(keys) ||
      keys.length !== 1 ||
      typeof keys[0] !== 'string'
    )
      return undefined
    if (outputs.some((node) => node !== bodyOutput && node !== contentType)) return undefined
    return {
      callableId: call.callableId,
      inputPaths,
      resultPath: form.inputs[0].path,
      outputKind: 'form-field',
      outputField: keys[0],
      setFormContentType: Boolean(contentType),
    }
  }
  const serializedForm = direction.nodes.find(
    (node): node is Extract<PipelineNode, { kind: 'builtin' }> =>
      node.kind === 'builtin' && node.operation === 'form.serialize',
  )
  if (callable.output?.shape === 'envelope' && serializedForm) {
    const output = bodyOutputs[0]
    if (
      bodyOutputs.length !== 1 ||
      output.destination !== 'body' ||
      output.source.nodeId !== serializedForm.id ||
      serializedForm.inputs.length !== 1 ||
      serializedForm.inputs[0].nodeId !== call.id ||
      serializedForm.inputs[0].path
    )
      return undefined
    return {
      callableId: call.callableId,
      inputPaths,
      outputKind: 'body',
      outputField: '',
      setFormContentType: Boolean(contentType),
    }
  }
  if (bodyOutputs.length !== 1 || bodyOutputs[0].source.nodeId !== call.id) return undefined
  const output = bodyOutputs[0]
  const base = {
    callableId: call.callableId,
    inputPaths,
    resultPath: output.source.path,
    setFormContentType: false,
  }
  if (output.destination === 'body') return { ...base, outputKind: 'body', outputField: '' }
  if (output.destination.startsWith('body.'))
    return { ...base, outputKind: 'json-field', outputField: output.destination.slice(5) }
  if (output.destination.toLowerCase().startsWith('header.'))
    return { ...base, outputKind: 'header', outputField: output.destination.slice(7) }
  if (output.destination.startsWith('query.'))
    return { ...base, outputKind: 'query', outputField: output.destination.slice(6) }
  return undefined
}

function suggestionOutput(request?: BrowserTransformSuggestion['request']): {
  outputKind?: GuidedOutputKind
  outputField?: string
} {
  if (!request?.destination) return {}
  if (request.serialization === 'form-field')
    return { outputKind: 'form-field', outputField: request.destination.slice(5) }
  if (request.serialization === 'json-field')
    return { outputKind: 'json-field', outputField: request.destination.slice(5) }
  if (request.serialization === 'header') return { outputKind: 'header', outputField: request.destination.slice(7) }
  if (request.serialization === 'query') return { outputKind: 'query', outputField: request.destination.slice(6) }
  return { outputKind: 'body' }
}

function newProfile(
  tab: BrowserTab,
  event?: RecordingEvent,
  callable?: PageCallable,
  suggestion?: BrowserTransformSuggestion,
): TransformProfileInput {
  const routeSource = suggestion?.request || event
  const guide = defaultGuide(callable, suggestionOutput(suggestion?.request))
  return {
    name: routeSource?.url
      ? `${routeSource.method || 'HTTP'} ${routeOf(routeSource, tab)} 明文网关`
      : `${tab.title || '当前页面'} 明文网关`,
    enabled: true,
    target: { tabId: tab.id, frameId: 0 },
    origin: originOf(tab.url),
    match: { methods: [routeSource?.method?.toUpperCase() || 'POST'], urlPattern: routeOf(routeSource, tab) },
    request: callable ? compileGuide(guide, callable) : emptyDirection(true),
    response: emptyDirection(false),
    failMode: 'closed',
    maxConcurrency: 2,
  }
}

function toInput(profile: TransformProfile): TransformProfileInput {
  return {
    id: profile.id,
    name: profile.name,
    enabled: profile.enabled,
    target: { ...profile.target },
    origin: profile.origin,
    match: { methods: [...profile.match.methods], urlPattern: profile.match.urlPattern },
    request: JSON.parse(JSON.stringify(profile.request)),
    response: JSON.parse(JSON.stringify(profile.response)),
    failMode: 'closed',
    maxConcurrency: profile.maxConcurrency,
  }
}

function utf8ToBase64(value: string): string {
  const bytes = new TextEncoder().encode(value)
  let binary = ''
  for (let offset = 0; offset < bytes.length; offset += 8192) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 8192))
  }
  return btoa(binary)
}

function formatSampleBody(value: string): string {
  try {
    const parsed = JSON.parse(value) as unknown
    return typeof parsed === 'object' && parsed !== null ? JSON.stringify(parsed, null, 2) : value
  } catch {
    return value
  }
}

function sampleHeaders(value: string): string {
  try {
    JSON.parse(value)
    return '{\n  "Content-Type": "application/json"\n}'
  } catch {
    return '{\n  "Content-Type": "text/plain; charset=utf-8"\n}'
  }
}

function nodeLabel(kind: PipelineNode['kind']): string {
  if (kind === 'context.read') return '上下文'
  if (kind === 'builtin') return '内置转换'
  if (kind === 'page.call') return '页面函数'
  return '输出'
}

function referencesOf(node: PipelineNode): NodeReference[] {
  if (node.kind === 'builtin') return node.inputs
  if (node.kind === 'page.call') return node.arguments
  if (node.kind === 'output.write') return [node.source]
  return []
}

type GuidedInputKind = 'body' | 'body-field' | 'text' | 'header-field' | 'query-field' | 'custom'

function splitInputPath(path: string): { kind: GuidedInputKind; field: string } {
  if (path === 'body') return { kind: 'body', field: '' }
  if (path === 'text') return { kind: 'text', field: '' }
  if (path.startsWith('body.')) return { kind: 'body-field', field: path.slice(5) }
  if (path.startsWith('headers.')) return { kind: 'header-field', field: path.slice(8) }
  if (path.startsWith('query.')) return { kind: 'query-field', field: path.slice(6) }
  return { kind: 'custom', field: path }
}

function joinInputPath(kind: GuidedInputKind, field: string): string {
  if (kind === 'body') return 'body'
  if (kind === 'text') return 'text'
  if (kind === 'body-field') return `body.${field.trim()}`
  if (kind === 'header-field') return `headers.${field.trim().toLowerCase()}`
  if (kind === 'query-field') return `query.${field.trim()}`
  return field.trim()
}

function outputFieldLabel(kind: GuidedOutputKind): string {
  if (kind === 'json-field') return 'JSON 字段名'
  if (kind === 'form-field') return '表单字段名'
  if (kind === 'header') return 'Header 名称'
  if (kind === 'query') return 'Query 参数名'
  return ''
}

function outputDescription(guide: GuidedDraft): string {
  const field = guide.outputField.trim() || '待填写字段'
  if (guide.outputKind === 'body') return '替换整个线上 Body'
  if (guide.outputKind === 'json-field') return `写入 JSON 字段 ${field}`
  if (guide.outputKind === 'form-field') return `组成表单字段 ${field}`
  if (guide.outputKind === 'header') return `写入 Header ${field}`
  return `写入 Query ${field}`
}

export const BrowserTransformWorkspace: React.FC<BrowserTransformWorkspaceProps> = ({
  active,
  deviceId,
  connected,
  running,
  selectedEvent,
  recordingTarget,
  runCapability,
  onOpenDeepCapture,
  suggestion,
  validatedSuggestion,
}) => {
  const recordingTabID = recordingTarget?.tabId
  const recordingFrameID = recordingTarget?.frameId
  const [workspaceView, dispatchWorkspace] = useReducer(
    browserTransformWorkspaceReducer,
    selectedEvent?.url || '',
    createBrowserTransformWorkspaceState,
  )
  const {
    tabs,
    profiles,
    callables,
    selectedID,
    draft,
    activeDirection,
    loading,
    error,
    testMethod,
    testURL,
    testHeaders,
    testBody,
    testSample,
    testResult,
    editorMode,
    confirmDeleteCallableID,
    validatedBaseline,
  } = workspaceView
  const setWorkspaceField = useCallback(function setWorkspaceField<K extends BrowserTransformWorkspaceField>(
    field: K,
    value: React.SetStateAction<BrowserTransformWorkspaceState[K]>,
  ) {
    dispatchWorkspace({ type: 'field.set', field, value })
  }, [])
  const setTabs = useCallback(
    (value: React.SetStateAction<typeof tabs>) => setWorkspaceField('tabs', value),
    [setWorkspaceField],
  )
  const setProfiles = useCallback(
    (value: React.SetStateAction<typeof profiles>) => setWorkspaceField('profiles', value),
    [setWorkspaceField],
  )
  const setCallables = useCallback(
    (value: React.SetStateAction<typeof callables>) => setWorkspaceField('callables', value),
    [setWorkspaceField],
  )
  const setSelectedID = useCallback(
    (value: React.SetStateAction<typeof selectedID>) => setWorkspaceField('selectedID', value),
    [setWorkspaceField],
  )
  const setDraft = useCallback(
    (value: React.SetStateAction<typeof draft>) => setWorkspaceField('draft', value),
    [setWorkspaceField],
  )
  const setActiveDirection = useCallback(
    (value: React.SetStateAction<typeof activeDirection>) => setWorkspaceField('activeDirection', value),
    [setWorkspaceField],
  )
  const setLoading = useCallback(
    (value: React.SetStateAction<typeof loading>) => setWorkspaceField('loading', value),
    [setWorkspaceField],
  )
  const setError = useCallback(
    (value: React.SetStateAction<typeof error>) => setWorkspaceField('error', value),
    [setWorkspaceField],
  )
  const setTestMethod = useCallback(
    (value: React.SetStateAction<typeof testMethod>) => setWorkspaceField('testMethod', value),
    [setWorkspaceField],
  )
  const setTestURL = useCallback(
    (value: React.SetStateAction<typeof testURL>) => setWorkspaceField('testURL', value),
    [setWorkspaceField],
  )
  const setTestHeaders = useCallback(
    (value: React.SetStateAction<typeof testHeaders>) => setWorkspaceField('testHeaders', value),
    [setWorkspaceField],
  )
  const setTestBody = useCallback(
    (value: React.SetStateAction<typeof testBody>) => setWorkspaceField('testBody', value),
    [setWorkspaceField],
  )
  const setTestSample = useCallback(
    (value: React.SetStateAction<typeof testSample>) => setWorkspaceField('testSample', value),
    [setWorkspaceField],
  )
  const setTestResult = useCallback(
    (value: React.SetStateAction<typeof testResult>) => setWorkspaceField('testResult', value),
    [setWorkspaceField],
  )
  const setEditorMode = useCallback(
    (value: React.SetStateAction<typeof editorMode>) => setWorkspaceField('editorMode', value),
    [setWorkspaceField],
  )
  const setConfirmDeleteCallableID = useCallback(
    (value: React.SetStateAction<typeof confirmDeleteCallableID>) =>
      setWorkspaceField('confirmDeleteCallableID', value),
    [setWorkspaceField],
  )
  const setValidatedBaseline = useCallback(
    (value: React.SetStateAction<typeof validatedBaseline>) => setWorkspaceField('validatedBaseline', value),
    [setWorkspaceField],
  )
  const selectedIDRef = useRef('')
  const initialLoadKey = useRef('')
  const handledSuggestion = useRef(0)
  const handledValidatedSuggestion = useRef(0)

  const selectID = useCallback((value: string) => {
    selectedIDRef.current = value
    setSelectedID(value)
  }, [])

  const call = useCallback(
    <T,>(method: string, params: Record<string, unknown> = {}) =>
      new Promise<T>((resolve, reject) => {
        runCapability(method, params, {
          silentEvents: true,
          onResult: (value) => resolve(value as T),
          onError: (message) => reject(new Error(message)),
        })
      }),
    [runCapability],
  )

  const readCallables = useCallback(
    async (target?: { tabId: number; frameId?: number; documentId?: string }) => {
      if (!target) {
        setCallables([])
        return []
      }
      const value = await call<unknown>('browser.callable.list', target)
      const next = Array.isArray(value) ? value.filter(isCallable) : []
      setCallables(next)
      return next
    },
    [call],
  )

  const load = useCallback(async () => {
    if (!active || !connected) return
    const suggestionRevisionAtStart = handledSuggestion.current
    const validatedRevisionAtStart = handledValidatedSuggestion.current
    setLoading(true)
    try {
      const tabValue = await call<unknown>('browser.tabs')
      const profileValue = await call<unknown>('browser.transform.profile.list')
      const nextTabs = Array.isArray(tabValue) ? tabValue.filter(isTab) : []
      const nextProfiles = Array.isArray(profileValue) ? profileValue.filter(isProfile) : []
      setTabs(nextTabs)
      setProfiles(nextProfiles)
      const selected = nextProfiles.find((profile) => profile.id === selectedIDRef.current) || nextProfiles[0]
      const suggestionArrivedDuringLoad = handledSuggestion.current !== suggestionRevisionAtStart
      const validationArrivedDuringLoad = handledValidatedSuggestion.current !== validatedRevisionAtStart
      if (!suggestionArrivedDuringLoad && !validationArrivedDuringLoad) {
        selectID(selected?.id || '')
        setDraft(selected ? toInput(selected) : undefined)
        setValidatedBaseline(undefined)
      }
      const target =
        (validationArrivedDuringLoad ? validatedSuggestion?.profile.target : undefined) ||
        (suggestionArrivedDuringLoad ? suggestion?.callable.target : undefined) ||
        selected?.target ||
        (recordingTabID ? { tabId: recordingTabID, frameId: recordingFrameID || 0 } : undefined) ||
        (nextTabs[0] ? { tabId: nextTabs[0].id, frameId: 0 } : undefined)
      const nextCallables = await readCallables(target)
      if (selected && !suggestionArrivedDuringLoad) {
        const direction = selected.request.enabled ? selected.request : selected.response
        setEditorMode(parseGuide(direction, nextCallables) ? 'guided' : 'advanced')
      }
      setError('')
    } catch (loadError) {
      setError(`${loadError}`)
    } finally {
      setLoading(false)
    }
  }, [
    active,
    call,
    connected,
    readCallables,
    recordingFrameID,
    recordingTabID,
    selectID,
    suggestion,
    validatedSuggestion,
  ])

  useEffect(() => {
    if (!connected) {
      initialLoadKey.current = ''
      return
    }
    if (!active) return
    const key = `${recordingTabID || ''}:${recordingFrameID || 0}`
    if (initialLoadKey.current === key) return
    initialLoadKey.current = key
    void load()
  }, [active, connected, load, recordingFrameID, recordingTabID])

  useEffect(() => {
    const tab = tabs.find((item) => item.id === recordingTabID) || tabs[0]
    if (!selectedEvent?.url && !selectedEvent?.method) return
    dispatchWorkspace({
      type: 'replay.seed',
      method: selectedEvent.method,
      url: selectedEvent.url ? absoluteURL(selectedEvent.url, tab?.url) : undefined,
    })
  }, [recordingTabID, selectedEvent?.id, selectedEvent?.method, selectedEvent?.url, tabs])

  useEffect(() => {
    if (!active || !suggestion || handledSuggestion.current >= suggestion.revision) return
    const tab = tabs.find((item) => item.id === recordingTabID) || tabs[0]
    if (!tab) return
    handledSuggestion.current = suggestion.revision
    selectedIDRef.current = ''
    const body = suggestion.sampleBody ? formatSampleBody(suggestion.sampleBody) : undefined
    dispatchWorkspace({
      type: 'suggestion.apply',
      callable: suggestion.callable,
      profile: newProfile(tab, selectedEvent, suggestion.callable, suggestion),
      method: suggestion.request.method || 'POST',
      url: absoluteURL(suggestion.request.url, tab.url),
      body,
      headers: suggestion.sampleBody ? sampleHeaders(suggestion.sampleBody) : undefined,
      sample: body ? { body, label: suggestion.sampleLabel || '录制短时样本' } : undefined,
    })
  }, [active, recordingTabID, selectID, selectedEvent, suggestion, tabs])

  useEffect(() => {
    if (
      !active ||
      !validatedSuggestion ||
      handledValidatedSuggestion.current >= validatedSuggestion.revision ||
      !tabs.length
    )
      return
    handledValidatedSuggestion.current = validatedSuggestion.revision
    let cancelled = false
    const applyValidatedSuggestion = async () => {
      setLoading(true)
      try {
        const tab = tabs.find((item) => item.id === validatedSuggestion.profile.target.tabId)
        if (!tab || originOf(tab.url) !== validatedSuggestion.profile.origin) {
          throw new Error('AI 验证草稿绑定的页面已经变化，请重新录制当前页面')
        }
        const nextCallables = await readCallables(validatedSuggestion.profile.target)
        if (cancelled) return
        const profile = JSON.parse(JSON.stringify(validatedSuggestion.profile)) as TransformProfileInput
        const direction = profile.request.enabled ? profile.request : profile.response
        const route = profile.match.urlPattern.replace(/^\*/, '')
        selectedIDRef.current = ''
        dispatchWorkspace({
          type: 'validation.apply',
          profile,
          baseline: {
            draft: JSON.stringify(profile),
            proofLevel: validatedSuggestion.proofLevel,
            comparisonSummary: validatedSuggestion.comparisonSummary,
          },
          editorMode: parseGuide(direction, nextCallables) ? 'guided' : 'advanced',
          method: profile.match.methods[0] || 'POST',
          url: absoluteURL(route || tab.url, tab.url),
        })
      } catch (loadError) {
        if (!cancelled) setError(`${loadError}`)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void applyValidatedSuggestion()
    return () => {
      cancelled = true
    }
  }, [active, readCallables, selectID, tabs, validatedSuggestion])

  const saved = profiles.find((profile) => profile.id === selectedID)
  const dirty = Boolean(draft && JSON.stringify(draft) !== JSON.stringify(saved ? toInput(saved) : undefined))
  const validationStillCurrent = Boolean(
    draft && validatedBaseline && JSON.stringify(draft) === validatedBaseline.draft,
  )
  const currentDirection = draft?.[activeDirection]
  const guide = useMemo(
    () => (currentDirection ? parseGuide(currentDirection, callables) : undefined),
    [callables, currentDirection],
  )
  const guidedCallable = callables.find((callable) => callable.id === guide?.callableId)
  const guidedEnvelopeFormat = envelopeBodyFormat(guidedCallable)
  const guidedValid = Boolean(
    guide &&
    guide.callableId &&
    guide.inputPaths.every((path) => path.trim()) &&
    (guide.outputKind === 'body' || guide.outputField.trim()),
  )
  const callableIDs = useMemo(() => new Set(callables.map((callable) => callable.id)), [callables])
  const referencedCallableIDs = useMemo(
    () =>
      draft
        ? [draft.request, draft.response]
            .flatMap((direction) => (direction.enabled ? direction.nodes : []))
            .filter((node): node is Extract<PipelineNode, { kind: 'page.call' }> => node.kind === 'page.call')
            .map((node) => node.callableId)
        : [],
    [draft],
  )
  const currentTab = tabs.find((tab) => tab.id === draft?.target.tabId)
  const bindingReady = Boolean(
    draft && originOf(currentTab?.url) === draft.origin && referencedCallableIDs.every((id) => callableIDs.has(id)),
  )
  const callableReferences = useMemo(() => {
    const references = new Map<string, number>()
    for (const profile of profiles) {
      for (const node of [profile.request, profile.response].flatMap((direction) =>
        direction.enabled ? direction.nodes : [],
      )) {
        if (node.kind !== 'page.call') continue
        references.set(node.callableId, (references.get(node.callableId) || 0) + 1)
      }
    }
    return references
  }, [profiles])
  const isProfileReady = useCallback(
    (profile: TransformProfile) =>
      originOf(tabs.find((tab) => tab.id === profile.target.tabId)?.url) === profile.origin &&
      [profile.request, profile.response]
        .flatMap((direction) => (direction.enabled ? direction.nodes : []))
        .filter((node): node is Extract<PipelineNode, { kind: 'page.call' }> => node.kind === 'page.call')
        .every((node) => callableIDs.has(node.callableId)),
    [callableIDs, tabs],
  )

  const selectProfile = async (profile: TransformProfile) => {
    selectID(profile.id)
    setDraft(toInput(profile))
    setValidatedBaseline(undefined)
    setActiveDirection(profile.request.enabled ? 'request' : 'response')
    setTestResult(undefined)
    try {
      const nextCallables = await readCallables(profile.target)
      setEditorMode(
        parseGuide(profile.request.enabled ? profile.request : profile.response, nextCallables) ? 'guided' : 'advanced',
      )
      setError('')
    } catch (readError) {
      setError(`${readError}`)
    }
  }

  const create = async () => {
    const preferredTab = tabs.find((tab) => tab.id === recordingTabID) || tabs[0]
    if (!preferredTab) {
      setError('当前共享会话没有可用标签页')
      return
    }
    let nextCallables: PageCallable[] = []
    try {
      nextCallables = await readCallables({ tabId: preferredTab.id, frameId: recordingFrameID || 0 })
    } catch {
      setCallables([])
    }
    selectID('')
    setDraft(newProfile(preferredTab, selectedEvent, nextCallables[0]))
    setValidatedBaseline(undefined)
    setActiveDirection('request')
    setEditorMode('guided')
    setTestURL(absoluteURL(selectedEvent?.url, preferredTab.url))
    setTestResult(undefined)
  }

  const patchDirection = (patcher: (value: TransformDirection) => TransformDirection) => {
    setDraft((current) => (current ? { ...current, [activeDirection]: patcher(current[activeDirection]) } : current))
    setTestResult(undefined)
  }

  const patchNode = (id: string, patch: Partial<PipelineNode>) =>
    patchDirection((current) => ({
      ...current,
      nodes: current.nodes.map((node) => (node.id === id ? ({ ...node, ...patch } as PipelineNode) : node)),
    }))

  const patchGuide = (next: GuidedDraft) => {
    const callable = callables.find((item) => item.id === next.callableId)
    patchDirection(() => compileGuide(next, callable))
  }

  const selectGuidedCallable = (callableID: string) => {
    if (!guide) return
    const callable = callables.find((item) => item.id === callableID)
    const defaults = defaultGuide(callable, { outputKind: guide.outputKind, outputField: guide.outputField })
    patchGuide({
      ...guide,
      callableId: callableID,
      inputPaths: defaults.inputPaths.map((path, index) => guide.inputPaths[index] || path),
    })
  }

  const patchGuideInput = (index: number, path: string) => {
    if (!guide) return
    patchGuide({ ...guide, inputPaths: guide.inputPaths.map((item, itemIndex) => (itemIndex === index ? path : item)) })
  }

  const addNode = (kind: PipelineNode['kind']) =>
    patchDirection((current) => {
      const previous = current.nodes.at(-1)
      const reference = previous ? { nodeId: previous.id } : { nodeId: '' }
      let node: PipelineNode
      if (kind === 'context.read') {
        node = { id: uid('context'), name: '读取上下文', kind, path: 'body' }
      } else if (kind === 'builtin') {
        node = {
          id: uid('builtin'),
          name: '转换数据',
          kind,
          operation: 'json.stringify',
          inputs: previous ? [reference] : [],
        }
      } else if (kind === 'page.call') {
        node = {
          id: uid('call'),
          name: callables[0]?.name || '调用页面函数',
          kind,
          callableId: callables[0]?.id || '',
          arguments: previous ? [reference] : [],
        }
      } else {
        node = { id: uid('output'), name: '写入输出', kind, destination: 'body', source: reference, encoding: 'auto' }
      }
      return { ...current, nodes: [...current.nodes, node] }
    })

  const patchReferences = (node: PipelineNode, references: NodeReference[]) => {
    if (node.kind === 'builtin') patchNode(node.id, { inputs: references })
    if (node.kind === 'page.call') patchNode(node.id, { arguments: references })
  }

  const save = async () => {
    if (!draft) return
    for (const [label, direction] of [
      ['请求', draft.request],
      ['响应', draft.response],
    ] as const) {
      if (direction.enabled && !direction.nodes.some((node) => node.kind === 'output.write')) {
        setError(`${label} Pipeline 至少需要一个输出节点`)
        return
      }
    }
    setLoading(true)
    try {
      const value = await call<unknown>('browser.transform.profile.save', draft as unknown as Record<string, unknown>)
      if (!isProfile(value)) throw new Error('浏览器没有返回有效的转换配置')
      const savedInput = toInput(value)
      setProfiles((current) => [value, ...current.filter((item) => item.id !== value.id)])
      selectID(value.id)
      setDraft(savedInput)
      if (validationStillCurrent && validatedBaseline) {
        setValidatedBaseline({ ...validatedBaseline, draft: JSON.stringify(savedInput) })
      }
      setError('')
      success('Pipeline v2 配置已保存')
    } catch (saveError) {
      setError(`${saveError}`)
    } finally {
      setLoading(false)
    }
  }

  const remove = async () => {
    if (!draft?.id) {
      setDraft(undefined)
      return
    }
    setLoading(true)
    try {
      const value = await call<unknown>('browser.transform.profile.delete', { id: draft.id })
      const remaining = Array.isArray(value)
        ? value.filter(isProfile)
        : profiles.filter((profile) => profile.id !== draft.id)
      setProfiles(remaining)
      selectID(remaining[0]?.id || '')
      setDraft(remaining[0] ? toInput(remaining[0]) : undefined)
      setError('')
    } catch (deleteError) {
      setError(`${deleteError}`)
    } finally {
      setLoading(false)
    }
  }

  const deleteCallable = async (callable: PageCallable) => {
    setLoading(true)
    try {
      const value = await call<unknown>('browser.callable.delete', {
        ...callable.target,
        callableId: callable.id,
      })
      const remaining = Array.isArray(value) ? value.filter(isCallable) : []
      setCallables(remaining)
      setConfirmDeleteCallableID('')
      setTestResult(undefined)
      setError('')
      success(callableReferences.get(callable.id) ? '页面函数已删除，引用它的明文网关需要重新绑定' : '页面函数已删除')
    } catch (deleteError) {
      setError(`${deleteError}`)
    } finally {
      setLoading(false)
    }
  }

  const execute = async () => {
    if (!draft?.id || dirty) {
      setError('请先保存当前 Pipeline')
      return
    }
    setLoading(true)
    try {
      const parsedHeaders = JSON.parse(testHeaders) as unknown
      if (!isObject(parsedHeaders)) throw new Error('Headers 必须是 JSON 对象')
      const value = await call<unknown>('browser.transform.execute', {
        profileId: draft.id,
        direction: activeDirection,
        packet: {
          method: testMethod.toUpperCase(),
          url: testURL,
          ...(activeDirection === 'response' ? { statusCode: 200 } : {}),
          headers: Object.entries(parsedHeaders).map(([name, headerValue]) => ({ name, value: String(headerValue) })),
          bodyBase64: utf8ToBase64(testBody),
        },
      })
      if (!isExecution(value)) throw new Error('浏览器没有返回有效的转换结果')
      setTestResult(value)
      setError('')
    } catch (executeError) {
      setError(`${executeError}`)
    } finally {
      setLoading(false)
    }
  }

  if (!connected) return null

  return (
    <div className={styles['gateway-workbench']}>
      <BrowserTransformProfileRail
        profiles={profiles}
        callables={callables}
        selectedID={selectedID}
        loading={loading}
        running={running}
        confirmDeleteCallableID={confirmDeleteCallableID}
        callableReferences={callableReferences}
        isProfileReady={isProfileReady}
        onCreate={() => void create()}
        onSelectProfile={(profile) => void selectProfile(profile)}
        onConfirmDeleteCallable={setConfirmDeleteCallableID}
        onDeleteCallable={(callable) => void deleteCallable(callable)}
        onReload={() => void load()}
      />

      <main className={styles['pipeline-pane']}>
        {!draft ? (
          <div className={styles['pipeline-empty']}>
            <ThunderboltOutlined />
            <strong>建立浏览器转换 Pipeline</strong>
            {callables.length ? (
              <YakitButton icon={<PlusOutlined />} onClick={() => void create()}>
                新建 Pipeline
              </YakitButton>
            ) : (
              <YakitButton icon={<ExperimentOutlined />} onClick={onOpenDeepCapture}>
                捕获页面函数
              </YakitButton>
            )}
          </div>
        ) : (
          <>
            <header className={styles['profile-head']}>
              <div>
                <YakitInput value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
                <small>{draft.origin} · document 生命周期</small>
                {validatedBaseline && (
                  <span
                    className={`${styles['ai-validation-mark']} ${validationStillCurrent ? styles.ready : styles.stale}`}
                  >
                    <CheckCircleOutlined />
                    {validationStillCurrent
                      ? validatedBaseline.proofLevel === 'execution-only'
                        ? 'AI 已完成页面真实回放'
                        : `AI 已完成${validatedBaseline.proofLevel === 'exact' ? '精确' : '结构'}验证`
                      : '草稿已修改，保存前建议重新验证'}
                    {validationStillCurrent && validatedBaseline.comparisonSummary ? (
                      <em>{validatedBaseline.comparisonSummary}</em>
                    ) : null}
                  </span>
                )}
              </div>
              <label>
                <YakitSwitch checked={draft.enabled} onChange={(enabled) => setDraft({ ...draft, enabled })} />
                <span>{draft.enabled ? '启用' : '停用'}</span>
              </label>
            </header>
            <section className={styles['route-row']}>
              <label>
                <span>目标页面</span>
                <YakitSelect
                  disabled={Boolean(draft.id)}
                  value={draft.target.tabId}
                  options={tabs.map((tab) => ({ value: tab.id, label: tab.title || tab.url }))}
                  onChange={async (tabId) => {
                    const tab = tabs.find((item) => item.id === tabId)
                    if (!tab) return
                    setDraft({ ...draft, target: { tabId, frameId: 0 }, origin: originOf(tab.url) })
                    try {
                      await readCallables({ tabId, frameId: 0 })
                      setError('')
                    } catch (targetError) {
                      setError(`${targetError}`)
                    }
                  }}
                />
              </label>
              <label>
                <span>方法</span>
                <YakitInput
                  value={draft.match.methods.join(', ')}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      match: {
                        ...draft.match,
                        methods: event.target.value
                          .split(',')
                          .map((item) => item.trim().toUpperCase())
                          .filter(Boolean),
                      },
                    })
                  }
                />
              </label>
              <label>
                <span>URL 匹配</span>
                <YakitInput
                  value={draft.match.urlPattern}
                  onChange={(event) =>
                    setDraft({ ...draft, match: { ...draft.match, urlPattern: event.target.value } })
                  }
                />
              </label>
              <label>
                <span>并发</span>
                <YakitSelect
                  value={draft.maxConcurrency}
                  options={[1, 2, 4, 8].map((value) => ({ value, label: `${value}` }))}
                  onChange={(maxConcurrency) => setDraft({ ...draft, maxConcurrency })}
                />
              </label>
            </section>
            <div className={styles['direction-tabs']}>
              {(['request', 'response'] as const).map((name) => (
                <button
                  key={name}
                  className={activeDirection === name ? styles.selected : ''}
                  onClick={() => {
                    setActiveDirection(name)
                    setEditorMode(parseGuide(draft[name], callables) ? 'guided' : 'advanced')
                    setTestResult(undefined)
                  }}
                >
                  <span>{name === 'request' ? '请求加密' : '响应解密'}</span>
                  <i className={draft[name].enabled ? styles.ready : ''}>
                    {draft[name].enabled ? `${draft[name].nodes.length} 节点` : '关闭'}
                  </i>
                </button>
              ))}
            </div>
            {currentDirection && (
              <section className={styles['pipeline-editor']}>
                <div className={styles['direction-head']}>
                  <div>
                    <strong>{activeDirection === 'request' ? '明文请求 → 线上请求' : '线上响应 → 明文响应'}</strong>
                    <small>
                      {editorMode === 'guided'
                        ? '确认三个业务选择，底层 Pipeline 自动生成'
                        : '直接编辑有序 DAG 与节点引用'}
                    </small>
                  </div>
                  <YakitSwitch
                    checked={currentDirection.enabled}
                    onChange={(enabled) => patchDirection((current) => ({ ...current, enabled }))}
                  />
                </div>
                {currentDirection.enabled && (
                  <>
                    <div className={styles['editor-mode']} role="tablist" aria-label="Pipeline 编辑方式">
                      <button
                        className={editorMode === 'guided' ? styles.selected : ''}
                        onClick={() => setEditorMode('guided')}
                      >
                        <ThunderboltOutlined /> 引导配置
                      </button>
                      <button
                        className={editorMode === 'advanced' ? styles.selected : ''}
                        onClick={() => setEditorMode('advanced')}
                      >
                        <CodeOutlined /> 高级 Pipeline
                      </button>
                    </div>

                    {editorMode === 'guided' &&
                      (!guide ? (
                        <div className={styles['guide-empty']}>
                          <ThunderboltOutlined />
                          <span>
                            <strong>
                              {currentDirection.nodes.length ? '这条 Pipeline 包含高级结构' : '选择页面函数后自动生成'}
                            </strong>
                            <small>
                              {currentDirection.nodes.length
                                ? '高级结构不会被静默改写；可以继续使用高级编辑，或明确替换为三步引导流程。'
                                : '无需添加节点、输入引用或内置转换。'}
                            </small>
                          </span>
                          <YakitButton
                            size="small"
                            disabled={!callables.length}
                            onClick={() => patchGuide(defaultGuide(callables[0]))}
                          >
                            {currentDirection.nodes.length ? '替换为引导流程' : '开始配置'}
                          </YakitButton>
                        </div>
                      ) : (
                        guide && (
                          <div className={styles.guide}>
                            <div className={styles['guide-flow']}>
                              <span>逻辑明文</span>
                              <i>→</i>
                              <strong>{guidedCallable?.name || '选择页面函数'}</strong>
                              <i>→</i>
                              <span>{outputDescription(guide)}</span>
                            </div>

                            <section className={styles['guide-step']}>
                              <span className={styles['guide-step-index']}>1</span>
                              <div>
                                <header>
                                  <strong>明文从哪里来</strong>
                                  <small>通常选择整个逻辑 Body；多参数函数会逐项显示。</small>
                                </header>
                                <div className={styles['guide-inputs']}>
                                  {guide.inputPaths.map((path, index) => {
                                    const source = splitInputPath(path)
                                    const slot = guidedCallable?.inputSlots?.filter((item) => !item.retained)[index]
                                    const needsField = !['body', 'text'].includes(source.kind)
                                    return (
                                      <div key={`${guide.callableId}:${index}`}>
                                        <label>
                                          <span>{slot ? `${slot.name} · ${slot.role}` : `参数 ${index + 1}`}</span>
                                          <YakitSelect
                                            value={source.kind}
                                            options={[
                                              { value: 'body', label: '整个逻辑 Body' },
                                              { value: 'body-field', label: 'Body 中的字段' },
                                              { value: 'text', label: '原始 Body 文本' },
                                              { value: 'header-field', label: 'Header 字段' },
                                              { value: 'query-field', label: 'Query 参数' },
                                              { value: 'custom', label: '高级上下文路径' },
                                            ]}
                                            onChange={(kind: GuidedInputKind) => {
                                              const field =
                                                kind === 'body-field'
                                                  ? 'value'
                                                  : kind === 'header-field'
                                                    ? 'authorization'
                                                    : kind === 'query-field'
                                                      ? 'value'
                                                      : kind === 'custom'
                                                        ? 'body'
                                                        : ''
                                              patchGuideInput(index, joinInputPath(kind, field))
                                            }}
                                          />
                                        </label>
                                        {needsField && (
                                          <label>
                                            <span>{source.kind === 'custom' ? '上下文路径' : '字段名'}</span>
                                            <YakitInput
                                              value={source.field}
                                              placeholder={source.kind === 'custom' ? 'body.account.id' : 'password'}
                                              onChange={(event) =>
                                                patchGuideInput(index, joinInputPath(source.kind, event.target.value))
                                              }
                                            />
                                          </label>
                                        )}
                                      </div>
                                    )
                                  })}
                                  {!guide.inputPaths.length && (
                                    <div className={styles['guide-note']}>
                                      这个页面函数不需要外部输入，将直接使用页面内保留的环境。
                                    </div>
                                  )}
                                </div>
                              </div>
                            </section>

                            <section className={styles['guide-step']}>
                              <span className={styles['guide-step-index']}>2</span>
                              <div>
                                <header>
                                  <strong>交给哪个页面函数</strong>
                                  <small>函数在当前页面文档中执行，Key、IV 与闭包值不会离开页面。</small>
                                </header>
                                <label>
                                  <span>页面能力</span>
                                  <YakitSelect
                                    value={guide.callableId}
                                    options={callables.map((callable) => ({
                                      value: callable.id,
                                      label: callable.name,
                                    }))}
                                    onChange={selectGuidedCallable}
                                  />
                                </label>
                                {guidedCallable && (
                                  <div className={styles['guide-callable-meta']}>
                                    <span>
                                      {guidedCallable.kind === 'recorded-call'
                                        ? '录制调用'
                                        : guidedCallable.kind === 'business-closure'
                                          ? '业务闭包'
                                          : guidedCallable.kind === 'request-transaction'
                                            ? '请求事务'
                                            : '全局函数'}
                                    </span>
                                    <strong>{guidedCallable.algorithm || guidedCallable.operation}</strong>
                                    <em>{activeInputCount(guidedCallable)} 个明文参数</em>
                                  </div>
                                )}
                                {!guidedEnvelopeFormat && (
                                  <details className={styles['guide-result']}>
                                    <summary>函数返回的是对象，需要取其中一个字段</summary>
                                    <label>
                                      <span>返回字段路径</span>
                                      <YakitInput
                                        value={guide.resultPath || ''}
                                        placeholder="例如 encryptedData；留空使用完整返回值"
                                        onChange={(event) =>
                                          patchGuide({ ...guide, resultPath: event.target.value || undefined })
                                        }
                                      />
                                    </label>
                                  </details>
                                )}
                              </div>
                            </section>

                            <section className={styles['guide-step']}>
                              <span className={styles['guide-step-index']}>3</span>
                              <div>
                                <header>
                                  <strong>线上请求写到哪里</strong>
                                  <small>选择报文形态即可，字段组合与节点引用由浏览器自动生成。</small>
                                </header>
                                {guidedEnvelopeFormat ? (
                                  <div className={styles['guide-envelope-contract']}>
                                    <CheckCircleOutlined />
                                    <span>
                                      <strong>
                                        {guidedEnvelopeFormat === 'form'
                                          ? '使用录制到的完整表单'
                                          : guidedEnvelopeFormat === 'json'
                                            ? '使用录制到的完整 JSON'
                                            : '使用录制到的完整 Body'}
                                      </strong>
                                      <small>
                                        {guidedCallable?.output?.paths.length
                                          ? `${guidedCallable.output.paths.length} 个线上字段由同一次页面调用产生，不会再次包装 encryptedData。`
                                          : '序列化形态由请求事务证据锁定，不允许模型或手工字段重复包装。'}
                                      </small>
                                    </span>
                                  </div>
                                ) : (
                                  <div className={styles['guide-output']}>
                                    <label>
                                      <span>输出形态</span>
                                      <YakitSelect
                                        value={guide.outputKind}
                                        options={[
                                          { value: 'body', label: '替换整个 Body' },
                                          { value: 'json-field', label: '写入 JSON 字段' },
                                          { value: 'form-field', label: '写入表单字段' },
                                          { value: 'header', label: '写入 Header' },
                                          { value: 'query', label: '写入 Query 参数' },
                                        ]}
                                        onChange={(outputKind: GuidedOutputKind) => {
                                          const outputField =
                                            outputKind === 'body'
                                              ? ''
                                              : guide.outputField ||
                                                (outputKind === 'header'
                                                  ? 'X-Sign'
                                                  : outputKind === 'query'
                                                    ? 'signature'
                                                    : 'encryptedData')
                                          patchGuide({
                                            ...guide,
                                            outputKind,
                                            outputField,
                                            setFormContentType: outputKind === 'form-field',
                                          })
                                        }}
                                      />
                                    </label>
                                    {guide.outputKind !== 'body' && (
                                      <label>
                                        <span>{outputFieldLabel(guide.outputKind)}</span>
                                        <YakitInput
                                          value={guide.outputField}
                                          placeholder={
                                            guide.outputKind === 'form-field'
                                              ? 'encryptedData'
                                              : guide.outputKind === 'header'
                                                ? 'X-Sign'
                                                : 'signature'
                                          }
                                          onChange={(event) =>
                                            patchGuide({ ...guide, outputField: event.target.value })
                                          }
                                        />
                                      </label>
                                    )}
                                  </div>
                                )}
                                {!guidedEnvelopeFormat && guide.outputKind === 'form-field' && (
                                  <label className={styles['guide-content-type']}>
                                    <YakitSwitch
                                      checked={guide.setFormContentType}
                                      onChange={(setFormContentType) => patchGuide({ ...guide, setFormContentType })}
                                    />
                                    <span>
                                      <strong>自动设置表单 Content-Type</strong>
                                      <small>
                                        生成 application/x-www-form-urlencoded，无需再添加固定值与 Header 节点。
                                      </small>
                                    </span>
                                  </label>
                                )}
                                <div className={`${styles['guide-ready']} ${guidedValid ? styles.ready : ''}`}>
                                  <CheckCircleOutlined />
                                  <span>
                                    {guidedValid
                                      ? `将自动生成 ${currentDirection.nodes.length} 个底层节点`
                                      : '补全页面函数、输入来源与输出字段后即可保存'}
                                  </span>
                                </div>
                              </div>
                            </section>
                          </div>
                        )
                      ))}

                    {editorMode === 'advanced' && (
                      <>
                        <div className={styles['advanced-notice']}>
                          <WarningOutlined />
                          <span>
                            <strong>高级 Pipeline</strong>{' '}
                            节点、引用与白名单操作会直接影响线上报文；常规加解密场景建议使用引导配置。
                          </span>
                        </div>
                        <div className={styles['node-list']}>
                          {currentDirection.nodes.map((node, index) => {
                            const available = currentDirection.nodes.slice(0, index)
                            const references = referencesOf(node)
                            const builtinOptions = node.kind === 'builtin' ? (node.options ?? {}) : {}
                            return (
                              <section className={styles['node-row']} key={node.id}>
                                <div className={styles['node-index']}>
                                  <span>{index + 1}</span>
                                  {index < currentDirection.nodes.length - 1 && <i />}
                                </div>
                                <div className={styles['node-fields']}>
                                  <header>
                                    <em>{nodeLabel(node.kind)}</em>
                                    <YakitInput
                                      value={node.name}
                                      onChange={(event) => patchNode(node.id, { name: event.target.value })}
                                    />
                                    <YakitButton
                                      type="text2"
                                      icon={<DeleteOutlined />}
                                      onClick={() =>
                                        patchDirection((current) => ({
                                          ...current,
                                          nodes: current.nodes.filter((item) => item.id !== node.id),
                                        }))
                                      }
                                    />
                                  </header>
                                  {node.kind === 'context.read' && (
                                    <label>
                                      <span>上下文路径</span>
                                      <YakitInput
                                        value={node.path}
                                        placeholder="body.password"
                                        onChange={(event) => patchNode(node.id, { path: event.target.value })}
                                      />
                                    </label>
                                  )}
                                  {node.kind === 'builtin' && (
                                    <>
                                      <label>
                                        <span>白名单操作</span>
                                        <YakitSelect
                                          value={node.operation}
                                          options={BUILTINS}
                                          onChange={(operation: BuiltinOperation) => patchNode(node.id, { operation })}
                                        />
                                      </label>
                                      {node.operation === 'value.literal' && (
                                        <label>
                                          <span>固定值</span>
                                          <YakitInput
                                            value={typeof builtinOptions.value === 'string' ? builtinOptions.value : ''}
                                            onChange={(event) =>
                                              patchNode(node.id, { options: { value: event.target.value } })
                                            }
                                          />
                                        </label>
                                      )}
                                      {['form.compose', 'object.compose'].includes(node.operation) && (
                                        <label>
                                          <span>字段名 · 按输入顺序</span>
                                          <YakitInput
                                            value={
                                              Array.isArray(builtinOptions.keys) ? builtinOptions.keys.join(', ') : ''
                                            }
                                            placeholder="encryptedData, signature"
                                            onChange={(event) =>
                                              patchNode(node.id, {
                                                options: {
                                                  ...builtinOptions,
                                                  keys: event.target.value
                                                    .split(',')
                                                    .map((item) => item.trim())
                                                    .filter(Boolean),
                                                },
                                              })
                                            }
                                          />
                                        </label>
                                      )}
                                      {node.operation === 'object.pick' && (
                                        <>
                                          <label>
                                            <span>读取路径</span>
                                            <YakitInput
                                              value={
                                                Array.isArray(builtinOptions.paths)
                                                  ? builtinOptions.paths.join(', ')
                                                  : ''
                                              }
                                              placeholder="account.id, profile.name"
                                              onChange={(event) =>
                                                patchNode(node.id, {
                                                  options: {
                                                    ...builtinOptions,
                                                    paths: event.target.value
                                                      .split(',')
                                                      .map((item) => item.trim())
                                                      .filter(Boolean),
                                                  },
                                                })
                                              }
                                            />
                                          </label>
                                          <label>
                                            <span>输出字段名</span>
                                            <YakitInput
                                              value={
                                                Array.isArray(builtinOptions.keys) ? builtinOptions.keys.join(', ') : ''
                                              }
                                              placeholder="accountId, name"
                                              onChange={(event) =>
                                                patchNode(node.id, {
                                                  options: {
                                                    ...builtinOptions,
                                                    keys: event.target.value
                                                      .split(',')
                                                      .map((item) => item.trim())
                                                      .filter(Boolean),
                                                  },
                                                })
                                              }
                                            />
                                          </label>
                                        </>
                                      )}
                                    </>
                                  )}
                                  {node.kind === 'page.call' && (
                                    <label>
                                      <span>页面函数</span>
                                      <YakitSelect
                                        value={node.callableId}
                                        options={callables.map((callable) => ({
                                          value: callable.id,
                                          label: callable.name,
                                        }))}
                                        onChange={(callableId) => patchNode(node.id, { callableId })}
                                      />
                                    </label>
                                  )}
                                  {((node.kind === 'builtin' && node.operation !== 'value.literal') ||
                                    node.kind === 'page.call') && (
                                    <div className={styles['node-references']}>
                                      <span>输入引用</span>
                                      {references.map((reference, referenceIndex) => (
                                        <div
                                          className={styles['node-reference-row']}
                                          key={`${node.id}:${referenceIndex}`}
                                        >
                                          <YakitSelect
                                            value={reference.nodeId}
                                            options={available.map((item) => ({ value: item.id, label: item.name }))}
                                            onChange={(nodeId) =>
                                              patchReferences(
                                                node,
                                                references.map((item, itemIndex) =>
                                                  itemIndex === referenceIndex ? { ...item, nodeId } : item,
                                                ),
                                              )
                                            }
                                          />
                                          <YakitInput
                                            value={reference.path || ''}
                                            placeholder="可选子路径"
                                            onChange={(event) =>
                                              patchReferences(
                                                node,
                                                references.map((item, itemIndex) =>
                                                  itemIndex === referenceIndex
                                                    ? { ...item, path: event.target.value || undefined }
                                                    : item,
                                                ),
                                              )
                                            }
                                          />
                                          <YakitButton
                                            type="text2"
                                            icon={<DeleteOutlined />}
                                            onClick={() =>
                                              patchReferences(
                                                node,
                                                references.filter((_, itemIndex) => itemIndex !== referenceIndex),
                                              )
                                            }
                                          />
                                        </div>
                                      ))}
                                      <YakitButton
                                        type="text"
                                        icon={<PlusOutlined />}
                                        disabled={!available.length}
                                        onClick={() =>
                                          patchReferences(node, [...references, { nodeId: available.at(-1)?.id || '' }])
                                        }
                                      >
                                        添加输入
                                      </YakitButton>
                                    </div>
                                  )}
                                  {node.kind === 'output.write' && (
                                    <div className={styles['node-output-grid']}>
                                      <label>
                                        <span>来源节点</span>
                                        <YakitSelect
                                          value={node.source.nodeId}
                                          options={available.map((item) => ({ value: item.id, label: item.name }))}
                                          onChange={(nodeId) =>
                                            patchNode(node.id, { source: { ...node.source, nodeId } })
                                          }
                                        />
                                      </label>
                                      <label>
                                        <span>子路径</span>
                                        <YakitInput
                                          value={node.source.path || ''}
                                          placeholder="可选"
                                          onChange={(event) =>
                                            patchNode(node.id, {
                                              source: { ...node.source, path: event.target.value || undefined },
                                            })
                                          }
                                        />
                                      </label>
                                      <label>
                                        <span>写入目标</span>
                                        <YakitInput
                                          value={node.destination}
                                          placeholder="body.encryptedData"
                                          onChange={(event) => patchNode(node.id, { destination: event.target.value })}
                                        />
                                      </label>
                                      <label>
                                        <span>编码</span>
                                        <YakitSelect
                                          value={node.encoding}
                                          options={ENCODINGS}
                                          onChange={(encoding: ValueEncoding) => patchNode(node.id, { encoding })}
                                        />
                                      </label>
                                    </div>
                                  )}
                                </div>
                              </section>
                            )
                          })}
                        </div>
                        <div className={styles['node-add']}>
                          <span>添加节点</span>
                          <YakitButton type="text" icon={<FileTextOutlined />} onClick={() => addNode('context.read')}>
                            上下文
                          </YakitButton>
                          <YakitButton type="text" icon={<ApartmentOutlined />} onClick={() => addNode('builtin')}>
                            内置转换
                          </YakitButton>
                          <YakitButton type="text" icon={<CodeOutlined />} onClick={() => addNode('page.call')}>
                            页面函数
                          </YakitButton>
                          <YakitButton
                            type="text"
                            icon={<ThunderboltOutlined />}
                            onClick={() => addNode('output.write')}
                          >
                            输出
                          </YakitButton>
                        </div>
                      </>
                    )}
                  </>
                )}
              </section>
            )}
            <footer className={styles['editor-actions']}>
              <span className={bindingReady ? styles.ready : styles.stale}>
                <i />
                {bindingReady ? '当前页面函数可用' : '页面函数缺失或文档已变化'}
              </span>
              <YakitButton type="text2" icon={<DeleteOutlined />} onClick={() => void remove()} />
              <YakitButton
                icon={<SaveOutlined />}
                disabled={
                  !dirty ||
                  loading ||
                  running ||
                  (editorMode === 'guided' && Boolean(currentDirection?.enabled) && (!guide || !guidedValid))
                }
                onClick={() => void save()}
              >
                保存配置
              </YakitButton>
            </footer>
          </>
        )}
      </main>

      <BrowserTransformReplayPanel
        direction={activeDirection}
        method={testMethod}
        url={testURL}
        headers={testHeaders}
        body={testBody}
        sample={testSample}
        result={testResult}
        error={error}
        canExecute={Boolean(draft?.id && !dirty && bindingReady && currentDirection?.enabled && !loading && !running)}
        onMethodChange={setTestMethod}
        onURLChange={setTestURL}
        onHeadersChange={setTestHeaders}
        onBodyChange={(value) => {
          setTestBody(value)
          setTestResult(undefined)
        }}
        onExecute={() => void execute()}
        footer={
          <BrowserTransformExternalAdapter
            active={active}
            deviceId={deviceId}
            profileId={draft?.id && !dirty ? draft.id : undefined}
            profileName={draft?.name}
            profileReady={Boolean(draft?.id && !dirty && bindingReady && draft.enabled)}
          />
        }
      />
    </div>
  )
}

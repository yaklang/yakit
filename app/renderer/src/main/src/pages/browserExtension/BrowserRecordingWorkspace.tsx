import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ApartmentOutlined,
  ArrowDownOutlined,
  BugOutlined,
  CopyOutlined,
  DeleteOutlined,
  ExperimentOutlined,
  LinkOutlined,
  PlayCircleOutlined,
  ReloadOutlined,
  RobotOutlined,
  RightOutlined,
  SafetyCertificateOutlined,
  SaveOutlined,
  StopOutlined,
  ThunderboltOutlined,
  WarningOutlined,
} from '@ant-design/icons'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitInput } from '@/components/yakitUI/YakitInput/YakitInput'
import { YakitSelect } from '@/components/yakitUI/YakitSelect/YakitSelect'
import { YakitSwitch } from '@/components/yakitUI/YakitSwitch/YakitSwitch'
import { success } from '@/utils/notification'
import styles from './BrowserRecordingWorkspace.module.scss'
import { BrowserDeepCaptureWorkspace } from './BrowserDeepCaptureWorkspace'
import { BrowserTransformWorkspace } from './BrowserTransformWorkspace'
import type {
  BrowserTransformSuggestion,
  BrowserTransformValidatedSuggestion,
  TransformPageCallable,
} from './browserTransformTypes'

type RecordingEventKind =
  | 'interaction'
  | 'fetch'
  | 'xhr'
  | 'form'
  | 'beacon'
  | 'worker'
  | 'message'
  | 'websocket'
  | 'crypto'
  | 'transform'
  | 'navigation'

interface RecordingCrypto {
  adapterId: string
  providerKind: 'native' | 'library' | 'business' | 'wasm' | 'unknown'
  family: 'symmetric' | 'asymmetric' | 'digest' | 'mac' | 'signature' | 'kdf' | 'key-management' | 'unknown'
  operation: string
  algorithm?: string
  mode?: string
  padding?: string
}

type RecordingArgumentRole =
  | 'data'
  | 'key'
  | 'iv'
  | 'algorithm'
  | 'options'
  | 'signature'
  | 'salt'
  | 'nonce'
  | 'aad'
  | 'unknown'

interface RecordingCallArgument {
  index: number
  role: RecordingArgumentRole
  dataType: string
  byteLength?: number
  replaceable: boolean
  retained: boolean
  summary?: string
}

interface RecordingEvidence {
  path: string
  fingerprint: string
  byteLength?: number
  preview?: string
}

export interface RecordingEvent {
  id: string
  sequence: number
  timestamp: number
  durationMs?: number
  traceId: string
  kind: RecordingEventKind
  operation: string
  label?: string
  url?: string
  method?: string
  crypto?: RecordingCrypto
  transform?: {
    adapterId: string
    providerKind: 'native' | 'library' | 'business' | 'wasm' | 'unknown'
    category: 'serializer' | 'canonicalization' | 'request-builder' | 'encoding' | 'compression'
    phase?: 'input' | 'output' | 'boundary'
  }
  scriptUrl?: string
  wrapperHandleId?: string
  documentId?: string
  error?: string
  inputs: RecordingEvidence[]
  outputs: RecordingEvidence[]
  inputPreview?: string
  outputPreview?: string
  byteLength?: number
  resultByteLength?: number
  callHandleId?: string
  callableCapable?: boolean
  arguments?: RecordingCallArgument[]
}

interface RecordingTrace {
  id: string
  label: string
  startedAt: number
  endedAt: number
  eventIds: string[]
  requestCount: number
  cryptoCount: number
  websocketCount: number
  messageCount: number
  navigationCount: number
  linkedValueCount: number
}

interface RecordingLink {
  id: string
  fromEventId: string
  toEventId: string
  fromPath: string
  toPath: string
}

type PageCallable = TransformPageCallable

interface CallableExecution {
  callableId: string
  type: string
  preview: string
  value: unknown
  byteLength?: number
  durationMs: number
}

interface ProfileInferenceEvidence {
  id: string
  strength: 'proven' | 'supported' | 'hypothesis'
  label: string
}

export interface ProfileInferenceCandidate {
  id: string
  traceId: string
  request: {
    eventId: string
    method: string
    url: string
    bodyFormat?: 'json' | 'form' | 'raw'
    destination?: string
    serialization?: 'raw-body' | 'json-field' | 'form-field' | 'header' | 'query'
  }
  source: {
    eventId: string
    kind: RecordingEventKind
    operation: string
    crypto?: RecordingCrypto
    callHandleId?: string
    arguments: RecordingCallArgument[]
    destination?: string
    serialization?: 'raw-body' | 'json-field' | 'form-field' | 'header' | 'query'
  }
  sources: Array<{
    eventId: string
    kind: RecordingEventKind
    operation: string
    crypto?: RecordingCrypto
    callHandleId?: string
    arguments: RecordingCallArgument[]
    destination?: string
    serialization?: 'raw-body' | 'json-field' | 'form-field' | 'header' | 'query'
  }>
  status: 'ready' | 'capture-required' | 'mapping-required' | 'insufficient-evidence'
  confidence: { score: number; level: 'high' | 'medium' | 'low' }
  summary: string
  flow: string[]
  evidence: ProfileInferenceEvidence[]
  missing: Array<{ label: string; action: string }>
  capturePlan?: {
    matcherEventId: string
    frameHints: Array<{ functionName: string; url?: string; support: number; averageDepth: number }>
    expectedDestinations: string[]
    sourceCount: number
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
  }
}

interface RecordingSnapshot {
  status: {
    active: boolean
    startedAt?: number
    documentAvailable: boolean
    endedReason?: 'user' | 'navigation'
    navigation?: { url: string; timestamp: number }
    count: number
    droppedCount: number
    target: { tabId: number; frameId?: number; documentId?: string }
    options?: { captureValues: boolean }
  }
  events: RecordingEvent[]
  traces: RecordingTrace[]
  links: RecordingLink[]
  callables: PageCallable[]
  profileCandidates: ProfileInferenceCandidate[]
}

export interface CapabilityRunOptions {
  silentEvents?: boolean
  onResult?: (value: unknown) => void
  onError?: (message: string) => void
}

export type RunBrowserCapability = (
  method: string,
  params: Record<string, unknown>,
  options?: CapabilityRunOptions,
) => void

export interface BrowserCryptoAnalysisRequest {
  target: { tabId: number; frameId: number; documentId?: string }
  traceId?: string
  candidateId?: string
  callableId?: string
}

interface BrowserRecordingWorkspaceProps {
  deviceId: string
  connected: boolean
  capabilities?: string[]
  running: boolean
  runCapability: RunBrowserCapability
  onAnalyzeWithAI?: (request: BrowserCryptoAnalysisRequest) => void
  validatedProfileSuggestion?: BrowserTransformValidatedSuggestion
}

const KIND_LABELS: Record<RecordingEventKind, string> = {
  interaction: '页面操作',
  fetch: 'Fetch',
  xhr: 'XHR',
  form: '表单',
  beacon: 'Beacon',
  worker: 'Worker',
  message: 'MessagePort',
  websocket: 'WebSocket',
  crypto: '密码调用',
  transform: '数据转换',
  navigation: '页面跳转',
}

const ARGUMENT_LABELS: Record<RecordingArgumentRole, string> = {
  data: '明文输入',
  key: 'Key',
  iv: 'IV',
  algorithm: '算法',
  options: '选项',
  signature: '签名',
  salt: 'Salt',
  nonce: 'Nonce',
  aad: 'AAD',
  unknown: '参数',
}

function confidenceLabel(candidate: ProfileInferenceCandidate): string {
  const level = candidate.confidence.level === 'high' ? '高' : candidate.confidence.level === 'medium' ? '中' : '低'
  return `${level}置信度 · ${candidate.confidence.score}`
}

function pathFromURL(value?: string): string {
  if (!value) return ''
  try {
    return new URL(value).pathname || '/'
  } catch {
    return value
  }
}

function eventTitle(event: RecordingEvent): string {
  if (event.kind === 'interaction') return event.label || event.operation
  if (event.kind === 'transform') return event.label || event.operation
  if (event.kind === 'fetch' || event.kind === 'xhr' || event.kind === 'form' || event.kind === 'beacon') {
    return `${event.method || 'GET'} ${pathFromURL(event.url) || '/'}`
  }
  return event.crypto?.algorithm || event.crypto?.operation || event.operation
}

function eventSource(event: RecordingEvent): string {
  if (event.transform) {
    const category = {
      serializer: '序列化',
      canonicalization: '规范化',
      'request-builder': '请求准备',
      encoding: '编码',
      compression: '压缩 / 解压',
    }[event.transform.category]
    return `${event.transform.adapterId} · ${category}`
  }
  return event.scriptUrl || event.url || '页面主世界'
}

function shortSample(event?: RecordingEvent): string | undefined {
  const value = event?.inputPreview || event?.inputs.find((item) => item.preview)?.preview
  return value?.trim() || undefined
}

function isSnapshot(value: unknown): value is RecordingSnapshot {
  if (!value || typeof value !== 'object') return false
  const input = value as Partial<RecordingSnapshot>
  return Boolean(
    input.status &&
    Array.isArray(input.events) &&
    Array.isArray(input.traces) &&
    Array.isArray(input.links) &&
    Array.isArray(input.callables) &&
    Array.isArray(input.profileCandidates),
  )
}

function isCallable(value: unknown): value is PageCallable {
  if (!value || typeof value !== 'object') return false
  const input = value as Partial<PageCallable>
  return typeof input.id === 'string' && typeof input.name === 'string' && typeof input.operation === 'string'
}

function isCallableExecution(value: unknown): value is CallableExecution {
  if (!value || typeof value !== 'object') return false
  const input = value as Partial<CallableExecution>
  return typeof input.callableId === 'string' && typeof input.preview === 'string'
}

export const BrowserRecordingWorkspace: React.FC<BrowserRecordingWorkspaceProps> = ({
  deviceId,
  connected,
  capabilities = [],
  running,
  runCapability,
  onAnalyzeWithAI,
  validatedProfileSuggestion,
}) => {
  const supportsTransform = capabilities.includes('browser.transform.profile.list')
  const supportsDeepCapture = capabilities.includes('browser.deep_capture.status')
  const supportsAIAnalysis = [
    'browser.recording.trace.list',
    'browser.recording.evidence.inspect',
    'browser.callable.inspect',
    'browser.callable.replay',
    'browser.packet.compare',
    'browser.profile.propose',
    'browser.profile.validate',
  ].every((capability) => capabilities.includes(capability))
  const [workspaceMode, setWorkspaceMode] = useState<'gateway' | 'recording' | 'deep'>('recording')
  const [autoArmRequest, setAutoArmRequest] = useState(0)
  const [deepPaused, setDeepPaused] = useState(false)
  const [snapshot, setSnapshot] = useState<RecordingSnapshot>()
  const [captureValues, setCaptureValues] = useState(false)
  const [selectedTraceID, setSelectedTraceID] = useState('')
  const [selectedEventID, setSelectedEventID] = useState('')
  const [error, setError] = useState('')
  const [callableOpen, setCallableOpen] = useState(false)
  const [callableName, setCallableName] = useState('')
  const [selectedCallableID, setSelectedCallableID] = useState('')
  const [callableArguments, setCallableArguments] = useState('[]')
  const [callableResult, setCallableResult] = useState<CallableExecution>()
  const [gatewaySuggestion, setGatewaySuggestion] = useState<BrowserTransformSuggestion>()

  useEffect(() => {
    if (validatedProfileSuggestion) setWorkspaceMode('gateway')
  }, [validatedProfileSuggestion])

  useEffect(() => {
    if ((workspaceMode === 'gateway' && !supportsTransform) || (workspaceMode === 'deep' && !supportsDeepCapture)) {
      setWorkspaceMode('recording')
    }
  }, [supportsDeepCapture, supportsTransform, workspaceMode])

  const acceptSnapshot = useCallback((value: unknown) => {
    if (!isSnapshot(value)) {
      setError('浏览器没有返回录制结果，请确认插件与引擎版本一致。')
      return
    }
    setSnapshot(value)
    if (value.status.options) setCaptureValues(value.status.options.captureValues)
    setError('')
  }, [])

  const readRecording = useCallback(
    (quiet = false) => {
      if (!connected || running) return
      runCapability(
        'browser.recording.get',
        { limit: 500 },
        {
          silentEvents: quiet,
          onResult: acceptSnapshot,
          onError: (message) => setError(message),
        },
      )
    },
    [acceptSnapshot, connected, runCapability, running],
  )

  useEffect(() => {
    if (!snapshot?.status.active || running || !connected) return
    const timer = window.setTimeout(() => readRecording(true), 1_500)
    return () => window.clearTimeout(timer)
  }, [connected, readRecording, running, snapshot?.status.active, snapshot?.status.count])

  useEffect(() => {
    if (workspaceMode === 'recording' && connected && !running && !snapshot) readRecording(true)
  }, [connected, readRecording, running, snapshot, workspaceMode])

  useEffect(() => {
    const traces = snapshot?.traces || []
    setSelectedTraceID((current) => (traces.some((trace) => trace.id === current) ? current : traces[0]?.id || ''))
  }, [snapshot?.traces])

  const selectedTrace = snapshot?.traces.find((trace) => trace.id === selectedTraceID)
  const traceEvents = useMemo(
    () =>
      selectedTrace
        ? selectedTrace.eventIds
            .map((id) => snapshot?.events.find((event) => event.id === id))
            .filter((event): event is RecordingEvent => Boolean(event))
        : [],
    [selectedTrace, snapshot?.events],
  )

  useEffect(() => {
    setSelectedEventID((current) =>
      traceEvents.some((event) => event.id === current)
        ? current
        : traceEvents.find((event) => event.callableCapable)?.id || traceEvents.at(-1)?.id || '',
    )
  }, [traceEvents])

  const selectedEvent = snapshot?.events.find((event) => event.id === selectedEventID)
  const selectedCallable = snapshot?.callables.find((callable) => callable.id === selectedCallableID)
  const incoming = selectedEvent ? snapshot?.links.filter((link) => link.toEventId === selectedEvent.id) || [] : []
  const outgoing = selectedEvent ? snapshot?.links.filter((link) => link.fromEventId === selectedEvent.id) || [] : []
  const traceCandidates = snapshot?.profileCandidates.filter((candidate) => candidate.traceId === selectedTraceID) || []
  const selectedCandidate =
    traceCandidates.find(
      (candidate) =>
        candidate.sources.some((source) => source.eventId === selectedEventID) ||
        candidate.request.eventId === selectedEventID,
    ) || traceCandidates[0]
  const documentAvailable = snapshot?.status.documentAvailable !== false
  const canDeepCapture =
    supportsDeepCapture &&
    documentAvailable &&
    Boolean(
      selectedEvent &&
      ['crypto', 'fetch', 'xhr', 'form', 'beacon', 'worker', 'message'].includes(selectedEvent.kind) &&
      (selectedEvent.url || selectedEvent.wrapperHandleId),
    )
  const selectedEventKey = selectedEvent?.id
  const selectedEventName = selectedEvent ? eventTitle(selectedEvent) : ''
  const selectedEventSample = shortSample(selectedEvent)

  const continueInference = (candidate: ProfileInferenceCandidate) => {
    setSelectedEventID(
      candidate.capturePlan?.matcherEventId ||
        (candidate.sources.length > 1 ? candidate.request.eventId : candidate.source.eventId),
    )
    setAutoArmRequest((current) => current + 1)
    setWorkspaceMode('deep')
  }

  const openSuggestedGateway = (candidate: ProfileInferenceCandidate, callable: PageCallable) => {
    setSnapshot((current) =>
      current
        ? {
            ...current,
            callables: [...current.callables.filter((item) => item.id !== callable.id), callable],
          }
        : current,
    )
    setGatewaySuggestion((current) => ({
      revision: (current?.revision || 0) + 1,
      callable,
      request: candidate.request,
      sampleBody: shortSample(snapshot?.events.find((event) => event.id === candidate.source.eventId)),
      sampleLabel: `${candidate.source.crypto?.algorithm || candidate.source.crypto?.operation || candidate.source.operation} · arg 0`,
    }))
    setWorkspaceMode('gateway')
  }

  const candidateCallable = (candidate: ProfileInferenceCandidate, current: RecordingSnapshot) =>
    current.callables.find(
      (callable) =>
        callable.provenance.eventId === candidate.source.eventId ||
        (callable.kind === 'request-transaction' && callable.provenance.traceId === candidate.traceId),
    )

  const ensureCandidateCallable = (
    candidate: ProfileInferenceCandidate,
    current: RecordingSnapshot,
    onReady: (callable: PageCallable) => void,
  ) => {
    const existing = candidateCallable(candidate, current)
    if (existing) {
      onReady(existing)
      return
    }
    if (!candidate.source.callHandleId) {
      setError('当前候选还没有可回放的页面函数，请先继续自动分析并捕获完整业务封装。')
      return
    }
    runCapability(
      'browser.callable.create',
      {
        source: 'recording',
        callHandleId: candidate.source.callHandleId,
        name: `${candidate.source.crypto?.algorithm || candidate.source.crypto?.operation || candidate.source.operation} 页面函数`,
      },
      {
        silentEvents: true,
        onResult: (value) => {
          if (!isCallable(value)) {
            setError('浏览器返回了无效的页面函数。')
            return
          }
          setSnapshot((previous) =>
            previous
              ? {
                  ...previous,
                  callables: [...previous.callables.filter((item) => item.id !== value.id), value],
                }
              : previous,
          )
          onReady(value)
          setError('')
        },
        onError: setError,
      },
    )
  }

  const createSuggestedGatewayFromSnapshot = (candidate: ProfileInferenceCandidate, current: RecordingSnapshot) => {
    ensureCandidateCallable(candidate, current, (callable) => {
      openSuggestedGateway(candidate, callable)
      success('已根据录制证据生成明文网关草稿')
    })
  }

  const createSuggestedGateway = (candidate: ProfileInferenceCandidate) => {
    if (!snapshot || !documentAvailable) {
      setError('页面已经导航，旧文档的页面函数不可再用于明文网关。')
      return
    }
    if (!snapshot.status.active) {
      createSuggestedGatewayFromSnapshot(candidate, snapshot)
      return
    }
    runCapability(
      'browser.recording.stop',
      {},
      {
        silentEvents: true,
        onResult: (value) => {
          if (!isSnapshot(value)) {
            setError('浏览器没有返回停止后的录制现场。')
            return
          }
          acceptSnapshot(value)
          createSuggestedGatewayFromSnapshot(candidate, value)
        },
        onError: setError,
      },
    )
  }

  const analyzeCandidateWithAI = (candidate?: ProfileInferenceCandidate) => {
    if (!snapshot || !onAnalyzeWithAI || !supportsAIAnalysis) return
    const launch = (current: RecordingSnapshot, callable?: PageCallable) => {
      onAnalyzeWithAI({
        target: {
          tabId: current.status.target.tabId,
          frameId: current.status.target.frameId || 0,
          documentId: current.status.target.documentId,
        },
        traceId: candidate?.traceId || selectedTraceID || undefined,
        candidateId: candidate?.id,
        callableId: callable?.id,
      })
    }
    if (!candidate) {
      launch(snapshot)
      return
    }
    const existing = candidateCallable(candidate, snapshot)
    if (existing) {
      launch(snapshot, existing)
      return
    }
    if (!candidate.source.callHandleId || !documentAvailable) {
      launch(snapshot)
      return
    }
    const prepare = (current: RecordingSnapshot) =>
      ensureCandidateCallable(candidate, current, (callable) => launch(current, callable))
    if (!snapshot.status.active) {
      prepare(snapshot)
      return
    }
    runCapability(
      'browser.recording.stop',
      {},
      {
        silentEvents: true,
        onResult: (value) => {
          if (!isSnapshot(value)) {
            setError('浏览器没有返回停止后的录制现场。')
            return
          }
          acceptSnapshot(value)
          prepare(value)
        },
        onError: setError,
      },
    )
  }

  useEffect(() => {
    if (!selectedEventKey) return
    setCallableName(`${selectedEventName} 页面函数`)
    setCallableArguments(JSON.stringify(selectedEventSample === undefined ? [] : [selectedEventSample], null, 2))
    setCallableOpen(false)
    setCallableResult(undefined)
  }, [selectedEventKey, selectedEventName, selectedEventSample])

  useEffect(() => {
    const callables = snapshot?.callables || []
    setSelectedCallableID((current) =>
      callables.some((callable) => callable.id === current) ? current : callables.at(-1)?.id || '',
    )
  }, [snapshot?.callables])

  const runSnapshotCommand = (method: string, params: Record<string, unknown>, message: string) => {
    setError('')
    runCapability(method, params, {
      silentEvents: true,
      onResult: (value) => {
        acceptSnapshot(value)
        success(message)
      },
      onError: setError,
    })
  }

  const start = () =>
    runSnapshotCommand(
      'browser.recording.start',
      { captureValues, maxEntries: 500, maxValueBytes: 8192 },
      captureValues ? '浏览器现场录制已开始；短时样本仅保留在本次浏览器会话' : '浏览器现场录制已开始',
    )

  const prepareCallableEditor = () => {
    if (!documentAvailable) return
    if (!snapshot?.status.active) {
      setCallableOpen(true)
      return
    }
    runCapability(
      'browser.recording.stop',
      {},
      {
        silentEvents: true,
        onResult: (value) => {
          if (!isSnapshot(value)) {
            setError('浏览器没有返回停止后的录制现场。')
            return
          }
          acceptSnapshot(value)
          setCallableOpen(true)
          success('录制已停止，请确认页面函数名称')
        },
        onError: setError,
      },
    )
  }

  const createCallable = () => {
    if (!selectedEvent?.callHandleId || !callableName.trim()) return
    runCapability(
      'browser.callable.create',
      {
        source: 'recording',
        callHandleId: selectedEvent.callHandleId,
        name: callableName.trim(),
      },
      {
        silentEvents: true,
        onResult: (value) => {
          if (!isCallable(value)) {
            setError('浏览器返回了无效的页面函数。')
            return
          }
          setSnapshot((current) =>
            current
              ? { ...current, callables: [...current.callables.filter((callable) => callable.id !== value.id), value] }
              : current,
          )
          setSelectedCallableID(value.id)
          setCallableOpen(false)
          setError('')
          success('页面函数已创建')
        },
        onError: setError,
      },
    )
  }

  const executeCallable = () => {
    if (!selectedCallable) return
    let args: unknown
    try {
      args = JSON.parse(callableArguments)
    } catch (parseError) {
      setError(`调用参数不是有效 JSON: ${parseError}`)
      return
    }
    if (!Array.isArray(args)) {
      setError('调用参数必须是 JSON 数组。')
      return
    }
    runCapability(
      'browser.callable.execute',
      { callableId: selectedCallable.id, args },
      {
        silentEvents: true,
        onResult: (value) => {
          if (!isCallableExecution(value)) {
            setError('浏览器返回了无效的页面函数执行结果。')
            return
          }
          setCallableResult(value)
          setError('')
          success('页面函数验证完成')
        },
        onError: setError,
      },
    )
  }

  const deleteCallable = () => {
    if (!selectedCallable) return
    runCapability(
      'browser.callable.delete',
      { callableId: selectedCallable.id },
      {
        silentEvents: true,
        onResult: (value) => {
          if (!Array.isArray(value)) {
            setError('浏览器返回了无效的页面函数列表。')
            return
          }
          setSnapshot((current) => (current ? { ...current, callables: value.filter(isCallable) } : current))
          setCallableResult(undefined)
          setError('')
        },
        onError: setError,
      },
    )
  }

  if (!connected) {
    return (
      <div className={styles['offline-state']}>
        <WarningOutlined />
        <strong>浏览器当前离线</strong>
        <span>保持插件与当前 Yak 引擎连接后，可以录制真实页面操作并创建前端页面函数。</span>
      </div>
    )
  }

  return (
    <div className={styles['recording-workspace']}>
      <div className={styles['recording-toolbar']}>
        <div className={styles['workspace-mode']} role="tablist" aria-label="浏览器现场模式">
          <button
            id="browser-recording-tab"
            type="button"
            role="tab"
            aria-controls="browser-recording-panel"
            aria-selected={workspaceMode === 'recording'}
            className={workspaceMode === 'recording' ? styles.selected : ''}
            disabled={deepPaused}
            onClick={() => setWorkspaceMode('recording')}
          >
            <ThunderboltOutlined /> 录制
          </button>
          {supportsDeepCapture && (
            <button
              id="browser-deep-capture-tab"
              type="button"
              role="tab"
              aria-controls="browser-deep-capture-panel"
              aria-selected={workspaceMode === 'deep'}
              className={workspaceMode === 'deep' ? styles.selected : ''}
              onClick={() => setWorkspaceMode('deep')}
            >
              <BugOutlined /> 深度捕获
            </button>
          )}
          {supportsTransform && (
            <button
              id="browser-transform-tab"
              type="button"
              role="tab"
              aria-controls="browser-transform-panel"
              aria-selected={workspaceMode === 'gateway'}
              className={workspaceMode === 'gateway' ? styles.selected : ''}
              disabled={deepPaused}
              onClick={() => setWorkspaceMode('gateway')}
            >
              <LinkOutlined /> 明文网关
            </button>
          )}
        </div>
        <div className={styles['recording-intro']}>
          <span className={`${styles['recording-dot']} ${snapshot?.status.active ? styles.active : ''}`} />
          <div>
            <strong>
              {workspaceMode === 'deep'
                ? '调用栈、作用域与运行时适配器'
                : workspaceMode === 'gateway'
                  ? '浏览器明文网关'
                  : snapshot?.status.active
                    ? '正在录制浏览器现场'
                    : '一次操作，一个可分析 Trace'}
            </strong>
            <span>
              {workspaceMode === 'deep'
                ? '从真实加密调用或请求入口捕获页面业务函数。'
                : workspaceMode === 'gateway'
                  ? '配置明文请求、线上报文与响应还原 Pipeline。'
                  : snapshot?.status.active
                    ? `${snapshot.status.count} 个事件，页面内函数句柄会在刷新后失效`
                    : '在目标页面完成登录、查询或加解密操作，再回到这里分析数据流。'}
            </span>
          </div>
        </div>
        <div
          className={`${styles['recording-command-slot']} ${workspaceMode === 'recording' ? '' : styles.inactive}`}
          aria-hidden={workspaceMode !== 'recording'}
        >
          <label className={styles['sample-switch']}>
            <YakitSwitch
              checked={captureValues}
              disabled={workspaceMode !== 'recording' || Boolean(snapshot?.status.active) || running}
              onChange={setCaptureValues}
            />
            <span>
              <strong>短时样本</strong>
              <small>关闭时仅保留本次录制的关联指纹</small>
            </span>
          </label>
          <div className={styles['recording-actions']}>
            <YakitButton
              type="text"
              icon={<ReloadOutlined />}
              disabled={workspaceMode !== 'recording' || running}
              onClick={() => readRecording(false)}
            >
              读取现场
            </YakitButton>
            {snapshot?.status.active ? (
              <YakitButton
                danger
                icon={<StopOutlined />}
                disabled={workspaceMode !== 'recording' || running}
                onClick={() => runSnapshotCommand('browser.recording.stop', {}, '浏览器现场录制已停止')}
              >
                停止录制
              </YakitButton>
            ) : (
              <YakitButton
                icon={<PlayCircleOutlined />}
                disabled={workspaceMode !== 'recording' || running}
                onClick={start}
              >
                开始录制
              </YakitButton>
            )}
          </div>
        </div>
      </div>

      <div
        id="browser-recording-panel"
        className={styles['workspace-panel']}
        role="tabpanel"
        aria-labelledby="browser-recording-tab"
        hidden={workspaceMode !== 'recording'}
      >
        {error && (
          <div className={styles['recording-error']}>
            <WarningOutlined />
            <span>{error}</span>
          </div>
        )}

        {!snapshot?.status.startedAt ? (
          <div className={styles['recording-empty']}>
            <ApartmentOutlined />
            <strong>还没有浏览器现场</strong>
            <span>
              点击“开始录制”，在浏览器中完成一段真实业务操作。录制器会关联页面交互、加解密调用、WebSocket 与请求。
            </span>
          </div>
        ) : (
          <>
            {snapshot.status.endedReason === 'navigation' && (
              <div className={styles['navigation-archive']} role="status">
                <WarningOutlined />
                <span>
                  <strong>页面跳转后，录制已自动停止</strong>
                  <small>Trace 与短时样本仍可分析；页面函数属于上一个文档，当前不可执行。</small>
                  {snapshot.status.navigation?.url && <code>{snapshot.status.navigation.url}</code>}
                </span>
              </div>
            )}
            <div className={styles['trace-workbench']}>
              <aside className={styles['trace-list']}>
                <header>
                  <span>业务 Trace</span>
                  <strong>{snapshot.traces.length}</strong>
                </header>
                <div>
                  {snapshot.traces.map((trace) => (
                    <button
                      key={trace.id}
                      className={trace.id === selectedTraceID ? styles.selected : ''}
                      onClick={() => setSelectedTraceID(trace.id)}
                    >
                      <ThunderboltOutlined />
                      <span>
                        <strong>{trace.label}</strong>
                        <small>
                          {trace.requestCount} 请求 · {trace.cryptoCount} 加密 · {trace.linkedValueCount} 关联
                        </small>
                        <time>{new Date(trace.startedAt).toLocaleTimeString()}</time>
                      </span>
                    </button>
                  ))}
                </div>
              </aside>

              <section className={styles.pipeline}>
                <header>
                  <div>
                    <strong>数据流 Pipeline</strong>
                    <span>{selectedTrace ? `${selectedTrace.eventIds.length} 个步骤` : '选择一个 Trace'}</span>
                  </div>
                  {selectedTrace?.linkedValueCount ? (
                    <span className={styles['link-count']}>
                      <LinkOutlined /> {selectedTrace.linkedValueCount} 个精确匹配
                    </span>
                  ) : null}
                </header>
                <div className={styles['pipeline-body']}>
                  {traceEvents.map((event, index) => {
                    const linked = snapshot.links.some(
                      (link) => link.fromEventId === event.id || link.toEventId === event.id,
                    )
                    return (
                      <div className={styles['pipeline-step']} key={event.id}>
                        <button
                          className={`${event.id === selectedEventID ? styles.selected : ''} ${linked ? styles.linked : ''}`}
                          onClick={() => setSelectedEventID(event.id)}
                        >
                          <span className={`${styles['event-kind']} ${styles[event.kind]}`}>
                            {event.kind === 'crypto' ? (
                              <ExperimentOutlined />
                            ) : event.kind === 'interaction' ? (
                              <ThunderboltOutlined />
                            ) : (
                              <ApartmentOutlined />
                            )}
                          </span>
                          <span>
                            <small>{KIND_LABELS[event.kind]}</small>
                            <strong>{eventTitle(event)}</strong>
                            <em>{eventSource(event)}</em>
                          </span>
                          <span className={styles['event-meta']}>
                            {event.callableCapable && <i>可复用</i>}
                            {event.durationMs !== undefined && <time>{event.durationMs.toFixed(1)} ms</time>}
                          </span>
                        </button>
                        {index < traceEvents.length - 1 && <ArrowDownOutlined className={styles['pipeline-arrow']} />}
                      </div>
                    )
                  })}
                </div>
              </section>

              <aside className={styles.inspector}>
                {!selectedEvent ? (
                  <div className={styles['inspector-empty']}>选择一个 Pipeline 步骤</div>
                ) : (
                  <>
                    <header>
                      <div>
                        <span>{KIND_LABELS[selectedEvent.kind]}</span>
                        <strong>{eventTitle(selectedEvent)}</strong>
                        <small>{eventSource(selectedEvent)}</small>
                      </div>
                      <i className={selectedEvent.error ? styles.error : ''}>
                        {selectedEvent.error ? 'ERROR' : `#${selectedEvent.sequence}`}
                      </i>
                    </header>
                    <dl>
                      <div>
                        <dt>输入</dt>
                        <dd>
                          {selectedEvent.byteLength === undefined
                            ? selectedEvent.inputs.length
                            : `${selectedEvent.byteLength} B`}
                        </dd>
                      </div>
                      <div>
                        <dt>输出</dt>
                        <dd>
                          {selectedEvent.resultByteLength === undefined
                            ? selectedEvent.outputs.length
                            : `${selectedEvent.resultByteLength} B`}
                        </dd>
                      </div>
                      <div>
                        <dt>上游</dt>
                        <dd>{incoming.length}</dd>
                      </div>
                      <div>
                        <dt>下游</dt>
                        <dd>{outgoing.length}</dd>
                      </div>
                    </dl>

                    {selectedCandidate && (
                      <section
                        className={`${styles['profile-inference']} ${styles[`is-${selectedCandidate.confidence.level}`]}`}
                      >
                        <div className={styles['profile-inference-heading']}>
                          <span className={styles['profile-inference-mark']}>
                            <ExperimentOutlined />
                          </span>
                          <span>
                            <small>自动推断 Profile</small>
                            <strong>{selectedCandidate.summary}</strong>
                          </span>
                          <i>
                            <SafetyCertificateOutlined />
                            {confidenceLabel(selectedCandidate)}
                          </i>
                        </div>
                        <div className={styles['profile-inference-flow']} aria-label="推断的数据流">
                          {selectedCandidate.flow.map((item, index) => (
                            <span key={`${item}-${index}`}>
                              <code>{item}</code>
                              {index < selectedCandidate.flow.length - 1 ? <RightOutlined /> : null}
                            </span>
                          ))}
                        </div>
                        {selectedCandidate.source.arguments.length > 0 && (
                          <dl className={styles['profile-inference-arguments']}>
                            {selectedCandidate.source.arguments.slice(0, 5).map((argument) => (
                              <div key={argument.index}>
                                <dt>
                                  {ARGUMENT_LABELS[argument.role]} · arg {argument.index}
                                </dt>
                                <dd>
                                  {argument.summary ||
                                    `${argument.dataType}${argument.byteLength === undefined ? '' : ` · ${argument.byteLength} B`}`}
                                </dd>
                              </div>
                            ))}
                          </dl>
                        )}
                        <details className={styles['profile-inference-evidence']}>
                          <summary>{selectedCandidate.evidence.length} 项证据</summary>
                          <ol>
                            {selectedCandidate.evidence.map((item) => (
                              <li key={item.id} data-strength={item.strength}>
                                <i />
                                {item.label}
                              </li>
                            ))}
                          </ol>
                        </details>
                        {selectedCandidate.missing[0] && (
                          <div className={styles['profile-inference-next']}>
                            <span>{selectedCandidate.missing[0].label}</span>
                            <div className={styles['profile-inference-actions']}>
                              {supportsAIAnalysis && (
                                <YakitButton
                                  type="outline2"
                                  icon={<RobotOutlined />}
                                  disabled={running}
                                  onClick={() => analyzeCandidateWithAI(selectedCandidate)}
                                >
                                  让 AI 解读证据
                                </YakitButton>
                              )}
                              {selectedCandidate.missing[0].action === 'capture-business-function' &&
                              supportsDeepCapture &&
                              documentAvailable ? (
                                <YakitButton
                                  icon={<BugOutlined />}
                                  onClick={() => continueInference(selectedCandidate)}
                                >
                                  继续自动分析
                                </YakitButton>
                              ) : null}
                            </div>
                          </div>
                        )}
                        {selectedCandidate.status === 'ready' && (
                          <div className={`${styles['profile-inference-next']} ${styles.ready}`}>
                            <span>
                              {documentAvailable
                                ? '页面调用与线上字段已经精确关联，只需确认明文来源与输出形态。'
                                : '关联证据仍然保留，但页面函数随上一个文档失效。'}
                            </span>
                            <div className={styles['profile-inference-actions']}>
                              <YakitButton
                                type={supportsAIAnalysis ? 'outline2' : 'primary'}
                                icon={<LinkOutlined />}
                                disabled={running || !documentAvailable}
                                onClick={() => createSuggestedGateway(selectedCandidate)}
                              >
                                {documentAvailable ? '直接生成' : '页面函数已失效'}
                              </YakitButton>
                              {supportsAIAnalysis && (
                                <YakitButton
                                  icon={<RobotOutlined />}
                                  disabled={running || !documentAvailable}
                                  onClick={() => analyzeCandidateWithAI(selectedCandidate)}
                                >
                                  AI 分析并验证
                                </YakitButton>
                              )}
                            </div>
                          </div>
                        )}
                      </section>
                    )}

                    {(selectedEvent.inputPreview || selectedEvent.outputPreview) && (
                      <div className={styles['value-preview']}>
                        <strong>短时样本</strong>
                        {selectedEvent.inputPreview && <pre>{selectedEvent.inputPreview}</pre>}
                        {selectedEvent.outputPreview && <pre>{selectedEvent.outputPreview}</pre>}
                      </div>
                    )}

                    {canDeepCapture && !selectedCandidate && (
                      <section className={styles['deep-capture-action']}>
                        <div>
                          <BugOutlined />
                          <span>
                            <strong>捕获真实业务上下文</strong>
                            <small>
                              {selectedEvent.kind === 'crypto'
                                ? '下次命中当前加密调用时暂停'
                                : '下次发出当前请求时暂停'}
                            </small>
                          </span>
                        </div>
                        <div className={styles['profile-inference-actions']}>
                          {supportsAIAnalysis && (
                            <YakitButton
                              type="outline2"
                              icon={<RobotOutlined />}
                              disabled={running}
                              onClick={() => analyzeCandidateWithAI()}
                            >
                              AI 分析 Trace
                            </YakitButton>
                          )}
                          <YakitButton icon={<BugOutlined />} onClick={() => setWorkspaceMode('deep')}>
                            深入当前调用
                          </YakitButton>
                        </div>
                      </section>
                    )}

                    {selectedEvent.callableCapable && selectedEvent.callHandleId && (
                      <section className={styles['recipe-create']}>
                        <div>
                          <ExperimentOutlined />
                          <span>
                            <strong>保存为页面函数</strong>
                            <small>
                              {!documentAvailable
                                ? '页面已经跳转，旧文档的调用句柄不可再保存'
                                : snapshot.status.active
                                  ? '保存前会先停止录制，避免轮询改变调用现场'
                                  : '保留原函数、receiver 与固定参数，页面刷新后失效'}
                            </small>
                          </span>
                        </div>
                        {!callableOpen ? (
                          <YakitButton
                            icon={<SaveOutlined />}
                            disabled={running || !documentAvailable}
                            onClick={prepareCallableEditor}
                          >
                            {snapshot.status.active ? '停止录制并保存' : '保存页面函数'}
                          </YakitButton>
                        ) : (
                          <div className={styles['recipe-form']}>
                            <label>
                              <span>页面函数名称</span>
                              <YakitInput
                                value={callableName}
                                onChange={(event) => setCallableName(event.target.value)}
                              />
                            </label>
                            <div className={styles['recipe-form-actions']}>
                              <YakitButton type="text" onClick={() => setCallableOpen(false)}>
                                取消
                              </YakitButton>
                              <YakitButton disabled={!callableName.trim() || running} onClick={createCallable}>
                                创建
                              </YakitButton>
                            </div>
                          </div>
                        )}
                      </section>
                    )}

                    {snapshot.callables.length > 0 && (
                      <section className={styles['recipe-runner']}>
                        <div className={styles['recipe-runner-heading']}>
                          <strong>验证页面函数</strong>
                          <YakitSelect
                            size="small"
                            value={selectedCallableID}
                            options={snapshot.callables.map((callable) => ({
                              value: callable.id,
                              label: callable.name,
                            }))}
                            onChange={(value) => {
                              setSelectedCallableID(value)
                              setCallableResult(undefined)
                            }}
                          />
                        </div>
                        {selectedCallable && (
                          <>
                            <span className={styles['recipe-operation']}>
                              {selectedCallable.operation} ·{' '}
                              {selectedCallable.kind === 'recorded-call' ? '录制调用' : '业务闭包'} ·{' '}
                              {selectedCallable.inputSlots.length} 个参数
                            </span>
                            <YakitInput.TextArea
                              rows={4}
                              isShowResize={false}
                              value={callableArguments}
                              placeholder={'["明文或结构化参数"]'}
                              onChange={(event) => setCallableArguments(event.target.value)}
                            />
                            <div className={styles['recipe-runner-actions']}>
                              <YakitButton type="text" danger icon={<DeleteOutlined />} onClick={deleteCallable} />
                              <YakitButton icon={<PlayCircleOutlined />} disabled={running} onClick={executeCallable}>
                                运行验证
                              </YakitButton>
                            </div>
                          </>
                        )}
                        {callableResult && (
                          <div className={styles['recipe-result']}>
                            <div>
                              <strong>输出 · {callableResult.type}</strong>
                              <span>
                                {callableResult.byteLength === undefined ? '' : `${callableResult.byteLength} B · `}
                                {callableResult.durationMs.toFixed(1)} ms
                              </span>
                              <YakitButton
                                type="text"
                                icon={<CopyOutlined />}
                                onClick={() => void navigator.clipboard.writeText(callableResult.preview)}
                              />
                            </div>
                            <pre>{callableResult.preview}</pre>
                          </div>
                        )}
                      </section>
                    )}
                  </>
                )}
              </aside>
            </div>
          </>
        )}
      </div>

      {supportsDeepCapture && (
        <div
          id="browser-deep-capture-panel"
          className={styles['workspace-panel']}
          role="tabpanel"
          aria-labelledby="browser-deep-capture-tab"
          hidden={workspaceMode !== 'deep'}
        >
          <BrowserDeepCaptureWorkspace
            active={workspaceMode === 'deep'}
            connected={connected}
            running={running}
            selectedEvent={selectedEvent}
            selectedCandidate={selectedCandidate}
            autoArmRequest={autoArmRequest}
            runCapability={runCapability}
            onPausedChange={setDeepPaused}
            onUseRecommendedCallable={openSuggestedGateway}
          />
        </div>
      )}

      {supportsTransform && (
        <div
          id="browser-transform-panel"
          className={styles['workspace-panel']}
          role="tabpanel"
          aria-labelledby="browser-transform-tab"
          hidden={workspaceMode !== 'gateway'}
        >
          <BrowserTransformWorkspace
            active={workspaceMode === 'gateway'}
            deviceId={deviceId}
            connected={connected}
            running={running}
            selectedEvent={selectedEvent}
            recordingTarget={documentAvailable ? snapshot?.status.target : undefined}
            runCapability={runCapability}
            onOpenDeepCapture={() => setWorkspaceMode('deep')}
            suggestion={gatewaySuggestion}
            validatedSuggestion={validatedProfileSuggestion}
          />
        </div>
      )}
    </div>
  )
}

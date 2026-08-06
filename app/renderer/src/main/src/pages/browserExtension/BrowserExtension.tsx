import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ApiOutlined,
  CheckCircleOutlined,
  CheckOutlined,
  ChromeOutlined,
  ClearOutlined,
  CloseOutlined,
  CodeOutlined,
  DeleteOutlined,
  EditOutlined,
  LinkOutlined,
  PlusOutlined,
  ReloadOutlined,
  RightOutlined,
  RobotOutlined,
  SafetyCertificateOutlined,
  StopOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons'
import { Spin } from 'antd'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitInput } from '@/components/yakitUI/YakitInput/YakitInput'
import { YakitTag } from '@/components/yakitUI/YakitTag/YakitTag'
import { YakitModalConfirm } from '@/components/yakitUI/YakitModal/YakitModalConfirm'
import { YakitSegmented } from '@/components/yakitUI/YakitSegmented/YakitSegmented'
import { YakitSelect } from '@/components/yakitUI/YakitSelect/YakitSelect'
import { YakEditor } from '@/utils/editors'
import { StringToUint8Array, Uint8ArrayToString } from '@/utils/str'
import { randomString } from '@/utils/randomUtil'
import { yakitBrowserExtension, yakitStream } from '@/services/electronBridge'
import { success, yakitFailed } from '@/utils/notification'
import emiter from '@/utils/eventBus/eventBus'
import {
  BrowserRecordingWorkspace,
  type BrowserCryptoAnalysisRequest,
  type CapabilityRunOptions,
  type RunBrowserCapability,
} from './BrowserRecordingWorkspace'
import { HistoryAIReActChatProvider, useHistoryAIReActChat } from '@/components/historyAIReActChat'
import { AISourceEnum, type AIInputEvent, type AIOutputEvent } from '@/pages/ai-re-act/hooks/grpcApi'
import { YakitRoute } from '@/enums/yakitRoute'
import {
  callBrowserExtensionCapability,
  type BrowserBridgeConnection,
  type BrowserCapabilityAccess,
  type BrowserCapabilityDescriptor,
} from './browserExtensionClient'
import {
  browserSnapshotResources,
  decodeBrowserSnapshotResource,
  decodeBrowserTaskResult,
  encodeBrowserTaskPayload,
  validateBrowserTaskEvent,
} from './browserProtocolValidation'
import type { BrowserTransformValidatedSuggestion } from './browserTransformTypes'
import {
  browserTransformValidationRejection,
  toBrowserTransformValidatedSuggestion,
  type BrowserCryptoValidationDraft,
} from './browserTransformContract'
import { BrowserCryptoTaskProgress } from './BrowserCryptoTaskProgress'
import { BrowserAuthorizationWorkspace } from './BrowserAuthorizationWorkspace'
import type { BrowserAuthorizationAnalysisRequest, BrowserAuthorizationDevice } from './browserAuthorizationTypes'
import {
  browserAuthorizationAIStartPolicy,
  browserAuthorizationAnalysisCopy,
  browserAuthorizationDefaultQuery,
} from './browserAuthorizationPresentation'
import {
  createBrowserCryptoTask,
  reduceBrowserCryptoTask,
  retryPromptForBrowserCryptoTask,
  type BrowserCryptoTaskAction,
  type BrowserCryptoTaskState,
} from './browserCryptoTaskState'
import styles from './BrowserExtension.module.scss'

interface BrowserBridgeStatus {
  revision: number
  running: boolean
  connected: boolean
  url?: string
  lastError?: string
  protocolVersion: number
  engineIdentityId: string
  engineInstanceId: string
  pairingOpenUntil?: number
  connections: BrowserBridgeConnection[]
}

interface BrowserPairingRequest {
  id: string
  installationId: string
  extensionId: string
  client: string
  clientVersion: string
  origin: string
  code: string
  createdAt: number
  expiresAt: number
}

interface PairedBrowserDevice {
  id: string
  installationId: string
  name: string
  client: string
  clientVersion: string
  origin: string
  createdAt: number
  lastSeenAt: number
}

interface BrowserExtensionSnapshot {
  status?: BrowserBridgeStatus
  pending: BrowserPairingRequest[]
  devices: PairedBrowserDevice[]
}

interface BrowserTaskEvent {
  TaskId: string
  DeviceId: string
  Type: 'queued' | 'running' | 'log' | 'result' | 'warning' | 'error' | 'cancelled' | 'completed'
  Message?: string
  Data?: Uint8Array
  Timestamp: number
  Sequence: number
}

type TaskMode = 'recording' | 'authorization' | 'capability' | 'script'

const ADD_NEW_BROWSER_IDENTITY = '__add_new_browser_identity__'
const BROWSER_CRYPTO_ANALYSIS_FORGE = 'browser_crypto_analysis'
const BROWSER_AUTHORIZATION_HANDOFF_STORAGE_KEY = 'browser.authorization.workspace.handoff.v1'

interface BrowserAuthorizationHandoff {
  event: 'authorization.workspace.open'
  workspaceId: string
  deviceId: string
  mode?: 'horizontal' | 'vertical'
}

function readBrowserAuthorizationHandoff(raw?: string | null): BrowserAuthorizationHandoff | undefined {
  try {
    const value = JSON.parse(raw || window.sessionStorage.getItem(BROWSER_AUTHORIZATION_HANDOFF_STORAGE_KEY) || 'null')
    if (
      value?.event === 'authorization.workspace.open' &&
      typeof value.workspaceId === 'string' &&
      typeof value.deviceId === 'string'
    )
      return value as BrowserAuthorizationHandoff
  } catch {
    // Ignore stale or unrelated browser-extension broadcasts.
  }
  return undefined
}
const CAPABILITY_ACCESS_LABELS: Record<BrowserCapabilityAccess, string> = {
  read: '读取',
  'sensitive-read': '敏感读取',
  write: '写入',
  control: '控制',
  execute: '执行',
  dangerous: '高权限',
}

function capabilityAccessTone(access: BrowserCapabilityAccess) {
  if (access === 'dangerous') return 'danger'
  if (access === 'execute' || access === 'control' || access === 'write') return 'warning'
  if (access === 'sensitive-read') return 'purple'
  return 'info'
}

function schemaExample(value: unknown, depth = 0): unknown {
  if (!value || typeof value !== 'object' || Array.isArray(value) || depth > 8) return null
  const schema = value as Record<string, unknown>
  if ('default' in schema) return schema.default
  if ('const' in schema) return schema.const
  if (Array.isArray(schema.enum) && schema.enum.length) return schema.enum[0]

  for (const keyword of ['oneOf', 'anyOf'] as const) {
    const alternatives = schema[keyword]
    if (Array.isArray(alternatives)) {
      const preferred =
        alternatives.find((item) => {
          if (!item || typeof item !== 'object' || Array.isArray(item)) return false
          const candidate = item as Record<string, unknown>
          return candidate.type === 'object' || Boolean(candidate.properties)
        }) || alternatives[0]
      return schemaExample(preferred, depth + 1)
    }
  }

  const type = Array.isArray(schema.type) ? schema.type.find((item) => item !== 'null') : schema.type
  if (type === 'object' || schema.properties) {
    const properties =
      schema.properties && typeof schema.properties === 'object' && !Array.isArray(schema.properties)
        ? (schema.properties as Record<string, unknown>)
        : {}
    const required = Array.isArray(schema.required)
      ? schema.required.filter((item): item is string => typeof item === 'string')
      : []
    return Object.fromEntries(
      required.filter((key) => key in properties).map((key) => [key, schemaExample(properties[key], depth + 1)]),
    )
  }
  if (type === 'array') {
    const minimum = typeof schema.minItems === 'number' ? Math.max(0, Math.min(schema.minItems, 3)) : 0
    return Array.from({ length: minimum }, () => schemaExample(schema.items, depth + 1))
  }
  if (type === 'boolean') return false
  if (type === 'integer' || type === 'number') {
    return typeof schema.minimum === 'number' ? schema.minimum : 1
  }
  if (type === 'string') {
    if (schema.format === 'uri') return 'https://example.com/'
    return 'value'
  }
  return null
}

function capabilityParamsTemplate(capability?: BrowserCapabilityDescriptor): string {
  if (!capability) return '{}'
  const example = schemaExample(capability.paramsSchema)
  const params = example && typeof example === 'object' && !Array.isArray(example) ? example : {}
  return JSON.stringify(params, null, 2)
}

const DEFAULT_SCRIPT = `tabs, err = browser.ExtensionCall("browser.tabs", {}, 15)
if err != nil {
    die(err)
}
yakit.Info("online tabs: %v", tabs)
`

async function requestBrowserExtension(
  method: string,
  path: string,
  body?: unknown,
): Promise<BrowserExtensionSnapshot> {
  const response = await yakitBrowserExtension.requestYakURL({
    Method: method,
    Url: { Schema: 'browser-extension', Location: 'local', Path: path, Query: [] },
    Body: body === undefined ? undefined : StringToUint8Array(JSON.stringify(body)),
  })
  const snapshot: BrowserExtensionSnapshot = { pending: [], devices: [] }
  for (const resource of browserSnapshotResources(response)) {
    const extras = Array.isArray(resource.Extra) ? resource.Extra : []
    const data = extras.find(
      (item) =>
        item && typeof item === 'object' && !Array.isArray(item) && (item as Record<string, unknown>).Key === 'data',
    ) as Record<string, unknown> | undefined
    const encoded = typeof data?.Value === 'string' ? data.Value : ''
    if (!encoded) continue
    const resourceType = String(resource.ResourceType)
    const value = decodeBrowserSnapshotResource(resourceType, encoded)
    if (resourceType === 'status') {
      snapshot.status = value as unknown as BrowserBridgeStatus
    }
    if (resourceType === 'pairing-request') snapshot.pending.push(value as unknown as BrowserPairingRequest)
    if (resourceType === 'paired-device') snapshot.devices.push(value as unknown as PairedBrowserDevice)
  }
  return snapshot
}

function shortIdentity(value?: string, length = 20): string {
  if (!value) return '-'
  return value.length > length ? `${value.slice(0, length)}...` : value
}

function formatTime(value?: number): string {
  if (!value) return '-'
  return new Date(value).toLocaleString()
}

function decodeTaskData(value?: Uint8Array): string {
  if (!value?.length) return ''
  try {
    return Uint8ArrayToString(value)
  } catch {
    return ''
  }
}

function formatTaskData(event: BrowserTaskEvent): string {
  const raw = decodeTaskData(event.Data)
  if (!raw) return event.Message || ''
  if (event.Type !== 'result') return event.Message || raw
  try {
    return JSON.stringify(JSON.parse(raw), null, 2)
  } catch {
    return raw
  }
}

function parseTaskResult(event: BrowserTaskEvent, schema: string, payload: Record<string, unknown>): unknown {
  const raw = decodeTaskData(event.Data)
  if (!raw) return undefined
  return decodeBrowserTaskResult(schema, payload, raw)
}

interface BrowserCryptoAIContext extends BrowserCryptoAnalysisRequest {
  kind: 'crypto'
  deviceId: string
  startedAt: number
  reviewPolicy: 'manual' | 'ai' | 'yolo'
}

interface BrowserAuthorizationAIContext extends BrowserAuthorizationAnalysisRequest {
  kind: 'authorization'
  startedAt: number
  reviewPolicy: 'manual' | 'ai' | 'yolo'
}

type BrowserAIContext = BrowserCryptoAIContext | BrowserAuthorizationAIContext

interface BrowserExtensionContentProps {
  onAnalysisContextChange: (context?: BrowserAIContext) => void
  analysisTask?: BrowserCryptoTaskState
  onAnalysisTaskAction: (action: BrowserCryptoTaskAction) => void
}

const BrowserExtensionContent: React.FC<BrowserExtensionContentProps> = ({
  onAnalysisContextChange,
  analysisTask,
  onAnalysisTaskAction,
}) => {
  const { renderHistoryAIReActChat, showFreeChat, setShowFreeChat, historyAIReActChatBridge, reviewPolicy } =
    useHistoryAIReActChat()
  const [snapshot, setSnapshot] = useState<BrowserExtensionSnapshot>({ pending: [], devices: [] })
  const [loading, setLoading] = useState(true)
  const [mutating, setMutating] = useState('')
  const [loadError, setLoadError] = useState('')
  const [editingID, setEditingID] = useState('')
  const [editingName, setEditingName] = useState('')
  const [pairingReplacementByRequest, setPairingReplacementByRequest] = useState<Record<string, string>>({})
  const [selectedDeviceID, setSelectedDeviceID] = useState('')
  const [taskMode, setTaskMode] = useState<TaskMode>('recording')
  const [authorizationHandoff, setAuthorizationHandoff] = useState<BrowserAuthorizationHandoff | undefined>(() =>
    readBrowserAuthorizationHandoff(),
  )
  const [capabilityMethod, setCapabilityMethod] = useState('browser.tabs')
  const [capabilityParamDrafts, setCapabilityParamDrafts] = useState<Record<string, string>>({})
  const [scriptCode, setScriptCode] = useState(DEFAULT_SCRIPT)
  const [taskRunning, setTaskRunning] = useState(false)
  const [taskEvents, setTaskEvents] = useState<BrowserTaskEvent[]>([])
  const [clock, setClock] = useState(Date.now())
  const [analysisContext, setAnalysisContext] = useState<BrowserAIContext>()
  const [validationDraft, setValidationDraft] = useState<BrowserCryptoValidationDraft>()
  const [validatedProfileSuggestion, setValidatedProfileSuggestion] = useState<BrowserTransformValidatedSuggestion>()
  const taskTokenRef = useRef('')
  const taskCleanupRef = useRef<() => void>(() => {})
  const validationRevisionRef = useRef(0)

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true)
    try {
      setSnapshot(await requestBrowserExtension('GET', '/snapshot'))
      setLoadError('')
    } catch (error) {
      setLoadError(`${error}`)
    } finally {
      if (!quiet) setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
    const refresh = (raw?: string) => {
      const handoff = readBrowserAuthorizationHandoff(raw)
      if (handoff) {
        setAuthorizationHandoff(handoff)
        setSelectedDeviceID(handoff.deviceId)
        setTaskMode('authorization')
      }
      void load(true)
    }
    emiter.on('onBrowserExtensionChanged', refresh)
    return () => emiter.off('onBrowserExtensionChanged', refresh)
  }, [load])

  useEffect(() => {
    if (!authorizationHandoff) return
    setTaskMode('authorization')
    if (snapshot.devices.some((device) => device.id === authorizationHandoff.deviceId)) {
      setSelectedDeviceID(authorizationHandoff.deviceId)
    }
  }, [authorizationHandoff, snapshot.devices])

  useEffect(() => {
    if (!snapshot.pending.length) return
    const timer = window.setInterval(() => setClock(Date.now()), 1_000)
    return () => window.clearInterval(timer)
  }, [snapshot.pending.length])

  useEffect(() => {
    const activeRequestIDs = new Set(snapshot.pending.map((request) => request.id))
    setPairingReplacementByRequest((current) => {
      const retained = Object.fromEntries(
        Object.entries(current).filter(([requestID]) => activeRequestIDs.has(requestID)),
      )
      return Object.keys(retained).length === Object.keys(current).length ? current : retained
    })
  }, [snapshot.pending])

  useEffect(() => {
    if (selectedDeviceID && !snapshot.devices.some((device) => device.id === selectedDeviceID)) {
      setSelectedDeviceID('')
    }
  }, [selectedDeviceID, snapshot.devices])

  useEffect(() => {
    return () => {
      taskCleanupRef.current()
      if (taskTokenRef.current) void yakitBrowserExtension.cancelTask(taskTokenRef.current)
    }
  }, [])

  const mutate = useCallback(async (key: string, method: string, path: string, body?: unknown, message?: string) => {
    setMutating(key)
    try {
      setSnapshot(await requestBrowserExtension(method, path, body))
      if (message) success(message)
    } catch (error) {
      yakitFailed(`${error}`)
    } finally {
      setMutating('')
    }
  }, [])

  const connectionsByDevice = useMemo(() => {
    return new Map((snapshot.status?.connections || []).map((connection) => [connection.deviceId, connection]))
  }, [snapshot.status?.connections])
  const selectedDevice = snapshot.devices.find((device) => device.id === selectedDeviceID)
  const selectedConnection = selectedDeviceID ? connectionsByDevice.get(selectedDeviceID) : undefined
  const authorizationDevices = useMemo<BrowserAuthorizationDevice[]>(() => {
    return snapshot.devices.flatMap((device) => {
      const connection = connectionsByDevice.get(device.id)
      if (!connection) return []
      return [
        {
          id: device.id,
          name: device.name,
          installationId: device.installationId,
          client: device.client,
          clientVersion: device.clientVersion,
          capabilities: connection.capabilities,
        },
      ]
    })
  }, [connectionsByDevice, snapshot.devices])
  const capabilityCatalog = selectedConnection?.capabilityCatalog
  const capabilityOptions = useMemo(
    () =>
      (capabilityCatalog?.capabilities || []).map((capability) => ({
        value: capability.method,
        label: `${capability.summary} · ${capability.method}`,
      })),
    [capabilityCatalog],
  )
  const selectedCapability = useMemo(
    () => capabilityCatalog?.capabilities.find((capability) => capability.method === capabilityMethod),
    [capabilityCatalog, capabilityMethod],
  )
  const capabilityParamDraftKey =
    selectedDeviceID && capabilityCatalog && capabilityMethod
      ? `${selectedDeviceID}:${capabilityCatalog.hash}:${capabilityMethod}`
      : ''
  const defaultCapabilityParams = useMemo(() => capabilityParamsTemplate(selectedCapability), [selectedCapability])
  const capabilityParams = capabilityParamDraftKey
    ? (capabilityParamDrafts[capabilityParamDraftKey] ?? defaultCapabilityParams)
    : '{}'
  const setCapabilityParams = useCallback(
    (value: string) => {
      if (!capabilityParamDraftKey) return
      setCapabilityParamDrafts((current) => ({
        ...current,
        [capabilityParamDraftKey]: value,
      }))
    },
    [capabilityParamDraftKey],
  )

  useEffect(() => {
    if (!selectedConnection) return
    const capabilities = selectedConnection.capabilityCatalog?.capabilities || []
    if (capabilities.some((capability) => capability.method === capabilityMethod)) return
    setCapabilityMethod(
      capabilities.find((capability) => capability.method === 'browser.tabs')?.method || capabilities[0]?.method || '',
    )
  }, [capabilityMethod, selectedConnection])

  const openPairing = () =>
    mutate('pairing-window', 'POST', '/pairing-window', { ttlSeconds: 120 }, '已开启 2 分钟配对窗口')
  const statusTone = !snapshot.status?.running ? 'danger' : snapshot.status.connected ? 'success' : 'warning'
  const statusLabel = !snapshot.status?.running
    ? 'Bridge 未运行'
    : snapshot.status.connected
      ? `${snapshot.status.connections.length} 个浏览器在线`
      : '等待浏览器'
  const pairingWindowRemaining = useMemo(
    () => Math.max(0, Math.ceil(((snapshot.status?.pairingOpenUntil || 0) - clock) / 1_000)),
    [clock, snapshot.status?.pairingOpenUntil],
  )

  const rejectPairing = (request: BrowserPairingRequest) => {
    const modal = YakitModalConfirm({
      width: 420,
      title: '拒绝浏览器配对',
      content: `拒绝 ${request.extensionId} 的本次配对申请？`,
      onOkText: '拒绝申请',
      onOk: async () => {
        await mutate(request.id, 'DELETE', `/pairings/${request.id}`, { message: 'Pairing rejected in Yakit' })
        modal.destroy()
      },
    })
  }

  const revokeDevice = (device: PairedBrowserDevice) => {
    const online = connectionsByDevice.has(device.id)
    const modal = YakitModalConfirm({
      width: 420,
      title: online ? '撤销在线浏览器信任' : '移除离线配对记录',
      content: online
        ? `撤销“${device.name}”的当前配对身份并立即断开连接？该身份再次连接前需要重新配对。`
        : `移除“${device.name}”的离线配对身份？若该身份仍在使用，下次连接时需要重新配对；此操作不会影响其他在线浏览器。`,
      onOkText: online ? '撤销并断开' : '移除记录',
      onOk: async () => {
        await mutate(
          device.id,
          'DELETE',
          `/devices/${device.id}`,
          undefined,
          online ? '浏览器信任已撤销' : '离线配对记录已移除',
        )
        modal.destroy()
      },
    })
  }

  const stopTask = useCallback(() => {
    const token = taskTokenRef.current
    if (!token) return
    void yakitBrowserExtension.cancelTask(token)
    taskCleanupRef.current()
    taskTokenRef.current = ''
    setTaskRunning(false)
  }, [])

  useEffect(() => {
    stopTask()
    setTaskEvents([])
    setAnalysisContext(undefined)
    setValidationDraft(undefined)
    setValidatedProfileSuggestion(undefined)
    setShowFreeChat(false)
    onAnalysisContextChange(undefined)
  }, [onAnalysisContextChange, selectedDeviceID, setShowFreeChat, stopTask])

  useEffect(() => {
    if (!analysisContext || analysisContext.deviceId !== selectedDeviceID) return
    onAnalysisTaskAction({ type: 'connection', online: Boolean(selectedConnection) })
  }, [analysisContext, onAnalysisTaskAction, selectedConnection, selectedDeviceID])

  const executeTask = useCallback(
    (schema: 'capability.call' | 'yak.script', payload: unknown, options: CapabilityRunOptions = {}) => {
      if (!selectedDeviceID || !selectedConnection) return
      if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
        options.onError?.('任务参数必须是 JSON 对象')
        return
      }
      const taskPayload = payload as Record<string, unknown>
      let encodedPayload: Uint8Array
      try {
        encodedPayload = encodeBrowserTaskPayload(taskPayload, schema)
      } catch (error) {
        options.onError?.(error instanceof Error ? error.message : `${error}`)
        return
      }
      stopTask()
      const token = randomString(40)
      taskTokenRef.current = token
      if (!options.silentEvents) setTaskEvents([])
      setTaskRunning(true)

      const cleanup = () => {
        offData()
        offError()
        offEnd()
      }
      const finish = () => {
        cleanup()
        if (taskTokenRef.current === token) taskTokenRef.current = ''
        setTaskRunning(false)
      }
      const offData = yakitStream.onData(token, (input: unknown) => {
        let event: BrowserTaskEvent
        try {
          event = validateBrowserTaskEvent(input) as BrowserTaskEvent
        } catch (error) {
          options.onError?.(error instanceof Error ? error.message : `${error}`)
          finish()
          return
        }
        if (!options.silentEvents) setTaskEvents((current) => [...current, event].slice(-500))
        if (event.Type === 'result' && options.onResult) {
          try {
            options.onResult(parseTaskResult(event, schema, taskPayload))
          } catch (error) {
            options.onError?.(error instanceof Error ? error.message : `${error}`)
          }
        }
        if (event.Type === 'error' || event.Type === 'cancelled') options.onError?.(event.Message || '浏览器任务失败')
      })
      const offError = yakitStream.onError(token, (error) => {
        if (!options.silentEvents) {
          setTaskEvents((current) => [
            ...current,
            {
              TaskId: token,
              DeviceId: selectedDeviceID,
              Type: 'error',
              Message: `${error}`,
              Timestamp: Date.now(),
              Sequence: current.length + 1,
            },
          ])
        }
        options.onError?.(`${error}`)
        finish()
      })
      const offEnd = yakitStream.onEnd(token, finish)
      taskCleanupRef.current = cleanup
      void yakitBrowserExtension
        .executeTask(
          {
            TaskId: token,
            DeviceId: selectedDeviceID,
            Schema: schema,
            Payload: encodedPayload,
            TimeoutMilliseconds: 120_000,
          },
          token,
        )
        .catch((error) => {
          yakitFailed(`${error}`)
          options.onError?.(`${error}`)
          finish()
        })
    },
    [selectedConnection, selectedDeviceID, stopTask],
  )

  const runCapability = () => {
    if (!selectedCapability) {
      yakitFailed('当前插件没有声明这个能力，请刷新连接后重试')
      return
    }
    try {
      const params = JSON.parse(capabilityParams || '{}')
      if (!params || typeof params !== 'object' || Array.isArray(params)) {
        yakitFailed('能力参数必须是一个 JSON 对象')
        return
      }
      executeTask('capability.call', { method: capabilityMethod, params })
    } catch (error) {
      yakitFailed(`参数不是有效 JSON: ${error}`)
    }
  }

  const runBrowserCapability = useCallback<RunBrowserCapability>(
    (method, params, options) => executeTask('capability.call', { method, params }, options),
    [executeTask],
  )

  const openBrowserCryptoAnalysis = useCallback(
    (request: BrowserCryptoAnalysisRequest) => {
      if (!selectedDeviceID || !selectedConnection) {
        yakitFailed('请先选择一个在线并已共享当前页面的浏览器')
        return
      }
      const context: BrowserCryptoAIContext = {
        kind: 'crypto',
        ...request,
        deviceId: selectedDeviceID,
        startedAt: Date.now(),
        reviewPolicy,
      }
      onAnalysisContextChange(context)
      setAnalysisContext(context)
      setValidationDraft(undefined)
      setShowFreeChat(true)
      historyAIReActChatBridge.onNewChat()
      const selected = [
        request.traceId ? `Trace=${request.traceId}` : '',
        request.candidateId ? `candidate=${request.candidateId}` : '',
        request.callableId ? `callable=${request.callableId}` : '',
      ]
        .filter(Boolean)
        .join('，')
      const query = [
        '分析当前浏览器页面已经录制的前端加密流程，并提出、真实回放、确定性验证一个明文网关 Profile。',
        '可以使用扩展在当前共享范围内声明的完整浏览器能力；实际调用遵循本会话选择的 Review 策略。',
        selected ? `优先从当前选择开始：${selected}。` : '先列出业务 Trace，再选择证据最完整的目标请求。',
        '若证据不足，请只说明最小的下一步操作，不要猜测请求序列化结构。',
      ].join('')
      window.setTimeout(() => {
        historyAIReActChatBridge.handleStart({
          qs: query,
          showQS: '分析当前前端加密流程',
          focusMode: '',
        })
      })
    },
    [
      historyAIReActChatBridge,
      onAnalysisContextChange,
      reviewPolicy,
      selectedConnection,
      selectedDeviceID,
      setShowFreeChat,
    ],
  )

  const openBrowserAuthorizationAnalysis = useCallback(
    (request: BrowserAuthorizationAnalysisRequest) => {
      const connection = snapshot.status?.connections.find((candidate) => candidate.deviceId === request.deviceId)
      if (!connection && !request.executionId) {
        yakitFailed('授权工作区的主浏览器已离线，请刷新身份与基线后重试')
        return
      }
      const context: BrowserAuthorizationAIContext = {
        kind: 'authorization',
        ...request,
        startedAt: Date.now(),
        reviewPolicy,
      }
      onAnalysisContextChange(context)
      setAnalysisContext(context)
      setValidationDraft(undefined)
      setShowFreeChat(true)
      historyAIReActChatBridge.onNewChat()
      const copy = browserAuthorizationAnalysisCopy(request)
      window.setTimeout(() => {
        historyAIReActChatBridge.handleStart({
          qs: copy.query,
          showQS: copy.showQS,
          focusMode: '',
        })
      })
    },
    [historyAIReActChatBridge, onAnalysisContextChange, reviewPolicy, setShowFreeChat, snapshot.status?.connections],
  )

  useEffect(() => {
    if (
      !showFreeChat ||
      !analysisContext ||
      analysisContext.kind !== 'crypto' ||
      !selectedConnection?.capabilities.includes('browser.profile.validation.latest')
    )
      return
    let disposed = false
    let reading = false
    const readValidationDraft = async () => {
      if (reading) return
      reading = true
      try {
        const draft = await callBrowserExtensionCapability<BrowserCryptoValidationDraft | null>(
          analysisContext.deviceId,
          'browser.profile.validation.latest',
          analysisContext.target,
          15_000,
        )
        if (disposed || !draft) return
        const rejection = browserTransformValidationRejection(draft, {
          target: analysisContext.target,
          startedAt: analysisContext.startedAt,
          now: Date.now(),
        })
        if (rejection) {
          onAnalysisTaskAction({ type: 'failure', stage: 'validate', message: rejection })
          return
        }
        setValidationDraft((current) => (current?.id === draft.id ? current : draft))
      } catch (error) {
        if (!disposed) {
          onAnalysisTaskAction({
            type: 'failure',
            stage: 'validate',
            message: error instanceof Error ? error.message : `${error}`,
          })
        }
      } finally {
        reading = false
      }
    }
    void readValidationDraft()
    const timer = window.setInterval(() => void readValidationDraft(), 1_500)
    return () => {
      disposed = true
      window.clearInterval(timer)
    }
  }, [analysisContext, onAnalysisTaskAction, selectedConnection, showFreeChat])

  useEffect(() => {
    if (!validationDraft) return
    onAnalysisTaskAction({ type: 'validation-available', draftId: validationDraft.id })
  }, [onAnalysisTaskAction, validationDraft])

  const loadValidatedProfile = useCallback(() => {
    if (!validationDraft) return
    validationRevisionRef.current += 1
    setValidatedProfileSuggestion(toBrowserTransformValidatedSuggestion(validationDraft, validationRevisionRef.current))
    setShowFreeChat(false)
    onAnalysisTaskAction({ type: 'profile-loaded' })
    success('已载入 AI 验证草稿，请确认后保存明文网关')
  }, [onAnalysisTaskAction, setShowFreeChat, validationDraft])

  const retryAnalysisTask = useCallback(() => {
    if (!analysisTask) return
    onAnalysisTaskAction({ type: 'retry' })
    historyAIReActChatBridge.handleStart({
      qs: retryPromptForBrowserCryptoTask(analysisTask),
      showQS: '继续当前分析阶段',
      focusMode: '',
    })
  }, [analysisTask, historyAIReActChatBridge, onAnalysisTaskAction])

  const reselectAnalysisTarget = useCallback(() => {
    setShowFreeChat(false)
    setAnalysisContext(undefined)
    setValidationDraft(undefined)
    onAnalysisContextChange(undefined)
  }, [onAnalysisContextChange, setShowFreeChat])

  return (
    <div className={styles['browser-extension-layout']}>
      <div className={styles['browser-extension-page']}>
        <header className={styles['page-header']}>
          <div>
            <h1>浏览器集成</h1>
            <p>管理 Yak 引擎与浏览器插件的可信设备和在线任务。</p>
          </div>
          <div className={styles['header-actions']}>
            <YakitButton type="outline2" icon={<ReloadOutlined />} loading={loading} onClick={() => void load()}>
              刷新
            </YakitButton>
            <YakitButton icon={<PlusOutlined />} loading={mutating === 'pairing-window'} onClick={openPairing}>
              添加浏览器
            </YakitButton>
          </div>
        </header>

        {loadError ? (
          <div className={styles['load-error']}>
            <CloseOutlined />
            <div>
              <strong>当前引擎不支持浏览器集成</strong>
              <span>{loadError}</span>
            </div>
            <YakitButton type="outline2" onClick={() => void load()}>
              重试
            </YakitButton>
          </div>
        ) : (
          <Spin spinning={loading}>
            <section className={styles['bridge-status']}>
              <div className={`${styles['status-signal']} ${styles[statusTone]}`}>
                <LinkOutlined />
              </div>
              <div className={styles['status-copy']}>
                <div>
                  <strong>Yak Browser Bridge</strong>
                  <YakitTag color={statusTone}>{statusLabel}</YakitTag>
                </div>
                <span>{snapshot.status?.url || '本机 Bridge 尚未监听'}</span>
              </div>
              <dl>
                <div>
                  <dt>协议</dt>
                  <dd>v{snapshot.status?.protocolVersion || '-'}</dd>
                </div>
                <div>
                  <dt>身份 / 本次进程</dt>
                  <dd title={`${snapshot.status?.engineIdentityId || ''} / ${snapshot.status?.engineInstanceId || ''}`}>
                    {shortIdentity(snapshot.status?.engineIdentityId)} /{' '}
                    {shortIdentity(snapshot.status?.engineInstanceId)}
                  </dd>
                </div>
                <div>
                  <dt>配对窗口</dt>
                  <dd>{pairingWindowRemaining > 0 ? `${pairingWindowRemaining} 秒` : '按需审批'}</dd>
                </div>
              </dl>
            </section>
            {snapshot.status?.lastError && <div className={styles['bridge-warning']}>{snapshot.status.lastError}</div>}

            <section className={styles['workspace-section']}>
              <div className={styles['section-heading']}>
                <div>
                  <h2>待确认申请</h2>
                  <span>
                    {snapshot.pending.length ? `${snapshot.pending.length} 个浏览器等待确认` : '没有待处理申请'}
                  </span>
                </div>
              </div>
              <div className={styles['request-list']}>
                {snapshot.pending.length === 0 && (
                  <div className={styles['empty-row']}>
                    <SafetyCertificateOutlined />
                    <span>暂无配对申请</span>
                  </div>
                )}
                {snapshot.pending.map((request) => {
                  const seconds = Math.max(0, Math.ceil((request.expiresAt - clock) / 1_000))
                  const replacementCandidates = snapshot.devices
                    .filter(
                      (device) =>
                        device.origin === request.origin &&
                        device.client === request.client &&
                        !connectionsByDevice.has(device.id),
                    )
                    .sort((left, right) => right.lastSeenAt - left.lastSeenAt)
                  const exactIdentity = replacementCandidates.find(
                    (device) => device.installationId === request.installationId,
                  )
                  const defaultReplacement = exactIdentity?.id || ADD_NEW_BROWSER_IDENTITY
                  const replacementChoice = pairingReplacementByRequest[request.id] || defaultReplacement
                  const replacementDevice = replacementCandidates.find((device) => device.id === replacementChoice)
                  return (
                    <article className={styles['pairing-request']} key={request.id}>
                      <div className={styles['browser-mark']}>
                        <ChromeOutlined />
                      </div>
                      <div className={styles['request-identity']}>
                        <strong>{request.client}</strong>
                        <span>{request.extensionId}</span>
                        <small>
                          插件 {request.clientVersion} · {shortIdentity(request.installationId, 24)}
                        </small>
                      </div>
                      <div className={styles['verification-code']}>
                        <span>验证码</span>
                        <strong>
                          {request.code.slice(0, 3)} {request.code.slice(3)}
                        </strong>
                        <small>{seconds} 秒后过期</small>
                      </div>
                      <div className={styles['pairing-target']}>
                        <span>配对方式</span>
                        {replacementCandidates.length ? (
                          <YakitSelect
                            size="small"
                            value={replacementChoice}
                            options={[
                              ...replacementCandidates.map((device) => ({
                                value: device.id,
                                label: `替换 ${device.name} · ${formatTime(device.lastSeenAt)}`,
                              })),
                              { value: ADD_NEW_BROWSER_IDENTITY, label: '作为新的浏览器身份添加' },
                            ]}
                            onChange={(value) =>
                              setPairingReplacementByRequest((current) => ({ ...current, [request.id]: value }))
                            }
                          />
                        ) : (
                          <strong>添加新的浏览器身份</strong>
                        )}
                      </div>
                      <div className={styles['row-actions']}>
                        <YakitButton
                          type="outline2"
                          danger
                          icon={<CloseOutlined />}
                          disabled={Boolean(mutating)}
                          onClick={() => rejectPairing(request)}
                        >
                          拒绝
                        </YakitButton>
                        <YakitButton
                          icon={<CheckOutlined />}
                          loading={mutating === request.id}
                          disabled={seconds <= 0}
                          onClick={() =>
                            void mutate(
                              request.id,
                              'POST',
                              `/pairings/${request.id}/approve`,
                              {
                                name: replacementDevice?.name || 'Chrome Browser',
                                ...(replacementDevice ? { replaceDeviceId: replacementDevice.id } : {}),
                              },
                              replacementDevice ? '原浏览器身份已更新' : '浏览器配对已批准',
                            )
                          }
                        >
                          {replacementDevice ? '替换并批准' : '批准'}
                        </YakitButton>
                      </div>
                    </article>
                  )
                })}
              </div>
            </section>

            <section className={styles['workspace-section']}>
              <div className={styles['section-heading']}>
                <div>
                  <h2>已配对浏览器</h2>
                  <span>
                    {snapshot.devices.length ? `${snapshot.devices.length} 个可信浏览器身份` : '尚未配对浏览器'}
                  </span>
                </div>
              </div>
              <div className={styles['device-table']}>
                <div className={styles['device-table-head']}>
                  <span>设备</span>
                  <span>状态</span>
                  <span>浏览器身份</span>
                  <span>最后在线</span>
                  <span>操作</span>
                  <span />
                </div>
                {snapshot.devices.length === 0 && (
                  <div className={styles['empty-row']}>
                    <ChromeOutlined />
                    <span>暂无可信浏览器身份</span>
                  </div>
                )}
                {snapshot.devices.map((device) => {
                  const connection = connectionsByDevice.get(device.id)
                  return (
                    <div
                      className={`${styles['device-row']} ${selectedDeviceID === device.id ? styles.selected : ''}`}
                      key={device.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelectedDeviceID(device.id)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') setSelectedDeviceID(device.id)
                      }}
                    >
                      <div className={styles['device-name']}>
                        <span className={styles['device-icon']}>
                          <ChromeOutlined />
                        </span>
                        {editingID === device.id ? (
                          <YakitInput
                            value={editingName}
                            maxLength={80}
                            onClick={(event) => event.stopPropagation()}
                            onChange={(event) => setEditingName(event.target.value)}
                          />
                        ) : (
                          <span>
                            <strong>{device.name}</strong>
                            <small>
                              {device.client} {device.clientVersion}
                            </small>
                          </span>
                        )}
                      </div>
                      <span className={styles['online-state']}>
                        <i className={connection ? styles.online : styles.offline} />
                        {connection ? '在线' : '离线'}
                      </span>
                      <code title={`安装身份：${device.installationId}\n扩展来源：${device.origin}`}>
                        {shortIdentity(device.installationId, 24)}
                      </code>
                      <span>{formatTime(connection?.connectedAt || device.lastSeenAt)}</span>
                      <div className={styles['row-actions']} onClick={(event) => event.stopPropagation()}>
                        {editingID === device.id ? (
                          <>
                            <YakitButton
                              type="text"
                              icon={<CheckOutlined />}
                              loading={mutating === device.id}
                              onClick={() =>
                                void mutate(
                                  device.id,
                                  'POST',
                                  `/devices/${device.id}`,
                                  { name: editingName },
                                  '设备名称已更新',
                                ).then(() => setEditingID(''))
                              }
                            />
                            <YakitButton type="text" icon={<CloseOutlined />} onClick={() => setEditingID('')} />
                          </>
                        ) : (
                          <YakitButton
                            type="text"
                            icon={<EditOutlined />}
                            onClick={() => {
                              setEditingID(device.id)
                              setEditingName(device.name)
                            }}
                          />
                        )}
                        <YakitButton
                          type="text"
                          danger
                          icon={<DeleteOutlined />}
                          disabled={Boolean(mutating)}
                          onClick={() => revokeDevice(device)}
                        />
                      </div>
                      <RightOutlined className={styles['open-device']} />
                    </div>
                  )
                })}
              </div>
            </section>

            {selectedDevice && (
              <section className={styles['device-workspace']}>
                <div className={styles['device-workspace-header']}>
                  <div>
                    <span className={styles['device-icon']}>
                      <ChromeOutlined />
                    </span>
                    <div>
                      <h2>{selectedDevice.name}</h2>
                      <span>
                        {selectedConnection ? `会话 ${shortIdentity(selectedConnection.sessionId, 28)}` : '设备离线'}
                      </span>
                    </div>
                  </div>
                  <div className={styles['workspace-actions']}>
                    <YakitSegmented
                      value={taskMode}
                      onChange={(value) => setTaskMode(value as TaskMode)}
                      options={[
                        {
                          label: (
                            <span>
                              <ThunderboltOutlined /> 浏览器现场
                            </span>
                          ),
                          value: 'recording',
                        },
                        {
                          label: (
                            <span>
                              <SafetyCertificateOutlined /> 授权差异
                            </span>
                          ),
                          value: 'authorization',
                        },
                        {
                          label: (
                            <span>
                              <ApiOutlined /> 能力调用
                            </span>
                          ),
                          value: 'capability',
                        },
                        {
                          label: (
                            <span>
                              <CodeOutlined /> Yak 脚本
                            </span>
                          ),
                          value: 'script',
                        },
                      ]}
                    />
                    {taskRunning ? (
                      <YakitButton danger icon={<StopOutlined />} onClick={stopTask}>
                        停止
                      </YakitButton>
                    ) : taskMode !== 'recording' && taskMode !== 'authorization' ? (
                      <YakitButton
                        icon={<ThunderboltOutlined />}
                        disabled={!selectedConnection || (taskMode === 'capability' && !selectedCapability)}
                        onClick={
                          taskMode === 'capability'
                            ? runCapability
                            : () => executeTask('yak.script', { code: scriptCode })
                        }
                      >
                        执行
                      </YakitButton>
                    ) : null}
                  </div>
                </div>
                {taskMode === 'recording' ? (
                  <BrowserRecordingWorkspace
                    key={selectedDeviceID}
                    deviceId={selectedDeviceID}
                    connected={Boolean(selectedConnection)}
                    capabilities={selectedConnection?.capabilities}
                    running={taskRunning}
                    runCapability={runBrowserCapability}
                    onAnalyzeWithAI={openBrowserCryptoAnalysis}
                    validatedProfileSuggestion={validatedProfileSuggestion}
                  />
                ) : taskMode === 'authorization' ? (
                  <BrowserAuthorizationWorkspace
                    devices={authorizationDevices}
                    defaultDeviceId={selectedDeviceID}
                    initialWorkspaceId={authorizationHandoff?.workspaceId}
                    initialDeviceId={authorizationHandoff?.deviceId}
                    onInitialWorkspaceLoaded={() => {
                      window.sessionStorage.removeItem(BROWSER_AUTHORIZATION_HANDOFF_STORAGE_KEY)
                      setAuthorizationHandoff(undefined)
                    }}
                    onAnalyzeWithAI={openBrowserAuthorizationAnalysis}
                    onPreparePairing={openPairing}
                    onRefreshDevices={() => load(true)}
                  />
                ) : (
                  <div className={styles['task-layout']}>
                    <div className={styles['task-input']}>
                      {taskMode === 'capability' ? (
                        <>
                          <div className={styles['field-label']}>调用能力</div>
                          <YakitSelect
                            value={capabilityMethod}
                            options={capabilityOptions}
                            onChange={setCapabilityMethod}
                            showSearch
                            optionFilterProp="label"
                            placeholder="选择当前插件声明的能力"
                          />
                          {selectedCapability ? (
                            <>
                              <div className={styles['capability-contract']}>
                                <div className={styles['capability-contract-heading']}>
                                  <span>
                                    <strong>{selectedCapability.summary}</strong>
                                    <code>{selectedCapability.method}</code>
                                  </span>
                                  <span className={styles['capability-contract-tags']}>
                                    <YakitTag size="small" color={capabilityAccessTone(selectedCapability.access)}>
                                      {CAPABILITY_ACCESS_LABELS[selectedCapability.access]}
                                    </YakitTag>
                                    <YakitTag size="small">{selectedCapability.domain}</YakitTag>
                                    <YakitTag size="small">{selectedCapability.targetMode} target</YakitTag>
                                  </span>
                                </div>
                                <div className={styles['capability-scopes']}>
                                  <span>基础权限</span>
                                  <code>
                                    {selectedCapability.scopes.length
                                      ? selectedCapability.scopes.join(' · ')
                                      : '无需 grant scope'}
                                  </code>
                                </div>
                                {Boolean(selectedCapability.conditionalScopes?.length) && (
                                  <div className={styles['capability-scopes']}>
                                    <span>条件权限</span>
                                    <code>
                                      {selectedCapability.conditionalScopes
                                        ?.map((item) => `${item.scope}（${item.when}）`)
                                        .join(' · ')}
                                    </code>
                                  </div>
                                )}
                                <details className={styles['capability-schema']}>
                                  <summary>
                                    参数契约 · Schema v{capabilityCatalog?.version}
                                    {' · '}
                                    {shortIdentity(capabilityCatalog?.hash, 16)}
                                  </summary>
                                  <pre>{JSON.stringify(selectedCapability.paramsSchema, null, 2)}</pre>
                                </details>
                              </div>
                              <div className={styles['field-label-row']}>
                                <span>参数 JSON</span>
                                <YakitButton
                                  type="text"
                                  size="small"
                                  onClick={() => setCapabilityParams(defaultCapabilityParams)}
                                >
                                  按 Schema 重置
                                </YakitButton>
                              </div>
                              <div className={styles['params-editor']}>
                                <YakEditor
                                  type="json"
                                  value={capabilityParams}
                                  setValue={setCapabilityParams}
                                  noMiniMap
                                />
                              </div>
                            </>
                          ) : (
                            <div className={styles['capability-catalog-empty']}>
                              当前连接没有可用的签名能力目录，请确认 Yak 引擎与浏览器插件均已更新并重新连接。
                            </div>
                          )}
                        </>
                      ) : (
                        <div className={styles['script-editor']}>
                          <YakEditor type="yak" value={scriptCode} setValue={setScriptCode} noMiniMap />
                        </div>
                      )}
                    </div>
                    <div className={styles['task-output']}>
                      <div className={styles['output-header']}>
                        <span>任务输出 {taskRunning && <i />}</span>
                        <YakitButton
                          type="text"
                          icon={<ClearOutlined />}
                          disabled={!taskEvents.length}
                          onClick={() => setTaskEvents([])}
                        >
                          清空
                        </YakitButton>
                      </div>
                      <div className={styles['output-body']}>
                        {!taskEvents.length && <div className={styles['output-empty']}>暂无输出</div>}
                        {taskEvents.map((event, index) => (
                          <div
                            className={`${styles['output-event']} ${styles[event.Type] || ''}`}
                            key={`${event.Sequence}-${index}`}
                          >
                            <time>{new Date(event.Timestamp).toLocaleTimeString()}</time>
                            <span>{event.Type}</span>
                            <pre>{formatTaskData(event)}</pre>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </section>
            )}
          </Spin>
        )}
      </div>
      {showFreeChat && (
        <aside className={styles['browser-ai-panel']}>
          {analysisTask && (
            <BrowserCryptoTaskProgress
              task={analysisTask}
              onRetry={retryAnalysisTask}
              onReselectTarget={reselectAnalysisTarget}
            />
          )}
          {validationDraft && (
            <div className={styles['browser-ai-validation']}>
              <CheckCircleOutlined />
              <span>
                <strong>明文网关已通过验证</strong>
                <small>
                  {validationDraft.profile.name}
                  {' · '}
                  {validationDraft.proofLevel === 'execution-only'
                    ? '页面真实回放'
                    : validationDraft.proofLevel === 'exact'
                      ? '精确数据包对比'
                      : '数据包结构对比'}
                </small>
              </span>
              <YakitButton size="small" onClick={loadValidatedProfile}>
                载入并确认
              </YakitButton>
            </div>
          )}
          {renderHistoryAIReActChat({
            className: styles['browser-ai-chat'],
            title: (
              <span className={styles['browser-ai-title']}>
                <RobotOutlined />
                <span>
                  <strong>{analysisContext?.kind === 'authorization' ? '授权差异分析' : '前端加密分析'}</strong>
                  <small>
                    {analysisContext?.kind === 'authorization' ? '确定性计划与证据' : '完整浏览器能力'}
                    {' · '}
                    {reviewPolicy.toUpperCase()} Review
                  </small>
                </span>
              </span>
            ),
            externalParameters: {
              isOpen: false,
              defaultValue:
                analysisContext?.kind === 'authorization'
                  ? '继续检查当前授权差异证据与确定性结论。'
                  : '继续检查当前 Trace，解释证据并验证明文网关。',
              rightIcon: {
                history: true,
                dataDetails: { type: 'text2' },
                add: (
                  <YakitButton
                    type="text2"
                    icon={<PlusOutlined />}
                    aria-label="新建分析会话"
                    onClick={() => historyAIReActChatBridge.onNewChat()}
                  />
                ),
                close: (
                  <YakitButton
                    type="text2"
                    icon={<CloseOutlined />}
                    aria-label="关闭 AI 分析"
                    onClick={() => setShowFreeChat(false)}
                  />
                ),
                taskDetails: true,
              },
            },
          })}
        </aside>
      )}
    </div>
  )
}

export const BrowserExtension: React.FC = () => {
  const analysisContextRef = useRef<BrowserAIContext | undefined>(undefined)
  const [analysisTask, setAnalysisTask] = useState<BrowserCryptoTaskState>()
  const handleAnalysisContextChange = useCallback((context?: BrowserAIContext) => {
    analysisContextRef.current = context
    setAnalysisTask(context?.kind === 'crypto' ? createBrowserCryptoTask(context, context.startedAt) : undefined)
  }, [])
  const handleAnalysisTaskAction = useCallback((action: BrowserCryptoTaskAction) => {
    setAnalysisTask((current) => (current ? reduceBrowserCryptoTask(current, action) : current))
  }, [])
  const handleAIOutputEvent = useCallback(
    (event: AIOutputEvent, content: string) => {
      handleAnalysisTaskAction({
        type: 'ai-output',
        event,
        content,
      })
    },
    [handleAnalysisTaskAction],
  )
  const transformInputEvent = useCallback((event: AIInputEvent): AIInputEvent => {
    if (!event.IsStart) return event
    const context = analysisContextRef.current
    if (!context) return event
    const authorization = context.kind === 'authorization'
    const query =
      event.Params?.UserQuery?.trim() ||
      (authorization
        ? browserAuthorizationDefaultQuery(context.mode, context.requestBudget)
        : '分析当前浏览器页面已录制的前端加密流程并验证明文网关。')
    const forgeParams = authorization
      ? [
          { Key: 'workspace_id', Value: context.workspaceId },
          { Key: 'query', Value: query },
        ]
      : [
          { Key: 'device_id', Value: context.deviceId },
          { Key: 'tab_id', Value: String(context.target.tabId) },
          { Key: 'frame_id', Value: String(context.target.frameId) },
          ...(context.target.documentId ? [{ Key: 'document_id', Value: context.target.documentId }] : []),
          { Key: 'query', Value: query },
        ]
    return {
      ...event,
      Params: {
        ...event.Params,
        UserQuery: query,
        ...(authorization ? browserAuthorizationAIStartPolicy() : { ForgeName: BROWSER_CRYPTO_ANALYSIS_FORGE }),
        ForgeParams: forgeParams,
        DisableToolUse: false,
        DisallowRequireForUserPrompt: true,
        EnablePlan: false,
        Source: 'browserExtension',
      },
    }
  }, [])

  return (
    <HistoryAIReActChatProvider
      source={AISourceEnum.browserExtension}
      route={YakitRoute.BrowserExtension}
      pageId={YakitRoute.BrowserExtension}
      focusModeLoop=""
      transformInputEvent={transformInputEvent}
      onAIOutputEvent={handleAIOutputEvent}
    >
      <BrowserExtensionContent
        onAnalysisContextChange={handleAnalysisContextChange}
        analysisTask={analysisTask}
        onAnalysisTaskAction={handleAnalysisTaskAction}
      />
    </HistoryAIReActChatProvider>
  )
}

export default BrowserExtension

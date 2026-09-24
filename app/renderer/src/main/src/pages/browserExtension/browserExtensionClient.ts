import { yakitBrowserExtension, yakitManagedBrowser, yakitStream } from '@/services/electronBridge'
import emiter from '@/utils/eventBus/eventBus'
import { randomString } from '@/utils/randomUtil'
import { StringToUint8Array, Uint8ArrayToString } from '@/utils/str'
import {
  browserSnapshotResources,
  decodeBrowserSnapshotResource,
  decodeBrowserTaskResult,
  encodeBrowserTaskPayload,
  validateBrowserTaskEvent,
} from './browserProtocolValidation'

type BrowserCapabilityDomain =
  | 'system'
  | 'page'
  | 'isolation'
  | 'authorization'
  | 'handoff'
  | 'network'
  | 'recording'
  | 'callable'
  | 'debugger'
  | 'transform'
  | 'proxy'

type BrowserCapabilityAccess = 'read' | 'sensitive-read' | 'write' | 'control' | 'execute' | 'dangerous'

interface BrowserCapabilityScopeCondition {
  scope: string
  when: string
}

interface BrowserCapabilityDescriptor {
  method: string
  domain: BrowserCapabilityDomain
  access: BrowserCapabilityAccess
  agentVisible?: boolean
  summary: string
  scopes: string[]
  conditionalScopes?: BrowserCapabilityScopeCondition[]
  targetMode: 'none' | 'tab' | 'document' | 'profile'
  defaultTimeoutMs: number
  paramsSchema: Record<string, unknown>
}

interface BrowserCapabilityCatalog {
  version: number
  schemaDialect: 'http://json-schema.org/draft-07/schema#'
  hash: string
  capabilities: BrowserCapabilityDescriptor[]
}

export interface BrowserBridgeConnection {
  deviceId: string
  installationId: string
  managedInstance?: {
    manager: 'ytray' | 'yakit'
    instanceId: string
    badge: string
  }
  client: string
  clientVersion: string
  capabilities: string[]
  capabilityCatalog?: BrowserCapabilityCatalog
  sessionId: string
  connectionId: string
  taskId?: string
  grantId?: string
  connectedAt: number
}

export interface BrowserBridgeStatus {
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

export interface PairedBrowserDevice {
  id: string
  installationId: string
  name: string
  client: string
  clientVersion: string
  origin: string
  createdAt: number
  lastSeenAt: number
}

export interface BrowserPairingRequest {
  id: string
  installationId: string
  managedInstance?: BrowserBridgeConnection['managedInstance']
  extensionId: string
  client: string
  clientVersion: string
  origin: string
  code: string
  createdAt: number
  expiresAt: number
}

export interface BrowserExtensionSnapshot {
  status?: BrowserBridgeStatus
  pending: BrowserPairingRequest[]
  devices: PairedBrowserDevice[]
}

export interface BrowserAutoApprovalError {
  kind: 'ytray-unavailable' | 'unverified' | 'approval-failed'
  message?: string
}

export interface BrowserAutoApprovalResult {
  snapshot: BrowserExtensionSnapshot
  errors: Record<string, BrowserAutoApprovalError>
}

interface BrowserTaskEvent {
  Type: 'queued' | 'running' | 'log' | 'result' | 'warning' | 'error' | 'cancelled' | 'completed'
  Message?: string
  Data?: Uint8Array
}

function browserTaskError(event: BrowserTaskEvent): Error {
  return new Error(event.Message || '浏览器任务失败')
}

export async function requestBrowserExtensionSnapshot(
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
    const encoded = extras.find(
      (item) =>
        item && typeof item === 'object' && !Array.isArray(item) && (item as Record<string, unknown>).Key === 'data',
    ) as Record<string, unknown> | undefined
    const raw = typeof encoded?.Value === 'string' ? encoded.Value : ''
    if (!raw) continue
    const resourceType = String(resource.ResourceType)
    const value = decodeBrowserSnapshotResource(resourceType, raw)
    if (resourceType === 'status') {
      snapshot.status = value as unknown as BrowserBridgeStatus
    }
    if (resourceType === 'pairing-request') snapshot.pending.push(value as unknown as BrowserPairingRequest)
    if (resourceType === 'paired-device') snapshot.devices.push(value as unknown as PairedBrowserDevice)
  }
  return snapshot
}

export const getBrowserExtensionSnapshot = () => requestBrowserExtensionSnapshot('GET', '/snapshot')

export const approveBrowserExtensionPairing = (request: BrowserPairingRequest) =>
  requestBrowserExtensionSnapshot('POST', `/pairings/${request.id}/approve`, {
    name: request.managedInstance?.badge ? `浏览器 ${request.managedInstance.badge}` : 'Browser Extension',
  })

export const rejectBrowserExtensionPairing = (request: BrowserPairingRequest) =>
  requestBrowserExtensionSnapshot('DELETE', `/pairings/${request.id}`, { message: 'Pairing rejected in Yakit' })

const autoApprovalInFlight = new Map<string, Promise<BrowserExtensionSnapshot | undefined>>()
const autoApprovalCompleted = new Map<string, { snapshot: BrowserExtensionSnapshot; expiresAt: number }>()
const autoApprovalRejected = new Set<string>()
const autoApprovalErrors = new Map<string, BrowserAutoApprovalError>()

export async function autoApproveYTrayPairings(
  initialSnapshot?: BrowserExtensionSnapshot,
): Promise<BrowserAutoApprovalResult> {
  let snapshot = initialSnapshot || (await getBrowserExtensionSnapshot())
  const now = Date.now()
  const pendingIds = new Set(snapshot.pending.map((request) => request.id))
  for (const [id, result] of autoApprovalCompleted) if (result.expiresAt <= now) autoApprovalCompleted.delete(id)
  for (const id of autoApprovalErrors.keys()) if (!pendingIds.has(id)) autoApprovalErrors.delete(id)
  for (const id of autoApprovalRejected) if (!pendingIds.has(id)) autoApprovalRejected.delete(id)

  for (const request of snapshot.pending) {
    const managedInstance = request.managedInstance
    if (
      managedInstance?.manager !== 'ytray' ||
      request.expiresAt <= Date.now() ||
      autoApprovalRejected.has(request.id)
    ) {
      continue
    }
    const completed = autoApprovalCompleted.get(request.id)
    if (completed) {
      snapshot = completed.snapshot
      continue
    }
    let approval = autoApprovalInFlight.get(request.id)
    if (!approval) {
      approval = (async () => {
        let claim: { approved: boolean; reason: string }
        try {
          claim = await yakitManagedBrowser.claimYTrayApproval(managedInstance.instanceId, request.id)
        } catch (error) {
          autoApprovalErrors.set(request.id, {
            kind: 'ytray-unavailable',
            message: (error instanceof Error ? error.message : `${error || '未知错误'}`).slice(0, 240),
          })
          return undefined
        }
        if (!claim.approved) {
          autoApprovalRejected.add(request.id)
          if (claim.reason === 'disabled') autoApprovalErrors.delete(request.id)
          else autoApprovalErrors.set(request.id, { kind: 'unverified' })
          return undefined
        }
        try {
          const approvedSnapshot = await approveBrowserExtensionPairing(request)
          autoApprovalErrors.delete(request.id)
          autoApprovalCompleted.set(request.id, { snapshot: approvedSnapshot, expiresAt: request.expiresAt })
          emiter.emit('onBrowserExtensionAutoApproved', managedInstance.badge)
          return approvedSnapshot
        } catch (error) {
          autoApprovalErrors.set(request.id, { kind: 'approval-failed', message: `${error}` })
          return undefined
        }
      })()
      autoApprovalInFlight.set(request.id, approval)
    }
    try {
      const approvedSnapshot = await approval
      if (approvedSnapshot) snapshot = approvedSnapshot
    } finally {
      if (autoApprovalInFlight.get(request.id) === approval) autoApprovalInFlight.delete(request.id)
    }
  }

  return { snapshot, errors: Object.fromEntries(autoApprovalErrors) }
}

export function executeBrowserExtensionTask<T>(
  deviceId: string,
  schema: string,
  payload: Record<string, unknown> = {},
  timeoutMilliseconds = 30_000,
): Promise<T> {
  const token = randomString(40)
  let encodedPayload: Uint8Array
  try {
    encodedPayload = encodeBrowserTaskPayload(payload, schema)
  } catch (error) {
    return Promise.reject(error)
  }
  return new Promise<T>((resolve, reject) => {
    let settled = false
    let offData = () => {}
    let offError = () => {}
    let offEnd = () => {}
    const finish = (handler: () => void) => {
      if (settled) return
      settled = true
      window.clearTimeout(timer)
      offData()
      offError()
      offEnd()
      handler()
    }
    offData = yakitStream.onData(token, (input: unknown) => {
      let event: BrowserTaskEvent
      try {
        event = validateBrowserTaskEvent(input) as BrowserTaskEvent
      } catch (error) {
        finish(() => reject(error instanceof Error ? error : new Error(`${error}`)))
        return
      }
      if (event.Type === 'result') {
        try {
          const raw = event.Data?.length ? Uint8ArrayToString(event.Data) : 'null'
          const result = decodeBrowserTaskResult(schema, payload, raw)
          finish(() => resolve(result as T))
        } catch (error) {
          finish(() => reject(error instanceof Error ? error : new Error(`浏览器返回了无效结果: ${error}`)))
        }
      }
      if (event.Type === 'error' || event.Type === 'cancelled') {
        finish(() => reject(browserTaskError(event)))
      }
    })
    offError = yakitStream.onError(token, (error) => finish(() => reject(new Error(`${error}`))))
    offEnd = yakitStream.onEnd(token, () => finish(() => reject(new Error('浏览器任务结束但没有返回结果'))))
    const timer = window.setTimeout(() => {
      void yakitBrowserExtension.cancelTask(token)
      finish(() => reject(new Error(`浏览器任务调用超时: ${schema}`)))
    }, timeoutMilliseconds + 1_000)

    void yakitBrowserExtension
      .executeTask(
        {
          TaskId: token,
          DeviceId: deviceId,
          Schema: schema,
          Payload: encodedPayload,
          TimeoutMilliseconds: timeoutMilliseconds,
        },
        token,
      )
      .catch((error) => finish(() => reject(error instanceof Error ? error : new Error(`${error}`))))
  })
}

export function callBrowserExtensionCapability<T>(
  deviceId: string,
  method: string,
  params: Record<string, unknown> = {},
  timeoutMilliseconds = 30_000,
): Promise<T> {
  return executeBrowserExtensionTask<T>(deviceId, 'capability.call', { method, params }, timeoutMilliseconds)
}

import { yakitBrowserExtension, yakitStream } from '@/services/electronBridge'
import { randomString } from '@/utils/randomUtil'
import { StringToUint8Array, Uint8ArrayToString } from '@/utils/str'
import { browserAuthorizationLifecycleError } from './browserAuthorizationLifecycle'
import {
  browserSnapshotResources,
  decodeBrowserSnapshotResource,
  decodeBrowserTaskResult,
  encodeBrowserTaskPayload,
  validateBrowserTaskEvent,
} from './browserProtocolValidation'
import { normalizeBrowserTransformAdapterStatus, type BrowserTransformAdapterStatus } from './browserTransformAdapter'

export type { BrowserTransformAdapterStatus } from './browserTransformAdapter'

export type BrowserCapabilityDomain =
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

export type BrowserCapabilityAccess = 'read' | 'sensitive-read' | 'write' | 'control' | 'execute' | 'dangerous'

export interface BrowserCapabilityScopeCondition {
  scope: string
  when: string
}

export interface BrowserCapabilityDescriptor {
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

export interface BrowserCapabilityCatalog {
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

export async function startBrowserTransformAdapter(input: {
  deviceId: string
  profileId: string
  port?: number
  timeoutMilliseconds?: number
}): Promise<BrowserTransformAdapterStatus> {
  const value = await yakitBrowserExtension.startTransformAdapter({
    DeviceId: input.deviceId,
    ProfileId: input.profileId,
    Host: '127.0.0.1',
    Port: input.port || 0,
    TimeoutMilliseconds: input.timeoutMilliseconds || 10_000,
  })
  return normalizeBrowserTransformAdapterStatus(value)
}

export async function getBrowserTransformAdapterStatus(): Promise<BrowserTransformAdapterStatus> {
  return normalizeBrowserTransformAdapterStatus(await yakitBrowserExtension.getTransformAdapterStatus())
}

export async function stopBrowserTransformAdapter(): Promise<BrowserTransformAdapterStatus> {
  return normalizeBrowserTransformAdapterStatus(await yakitBrowserExtension.stopTransformAdapter())
}

interface BrowserTaskEvent {
  Type: 'queued' | 'running' | 'log' | 'result' | 'warning' | 'error' | 'cancelled' | 'completed'
  Message?: string
  Data?: Uint8Array
}

function browserTaskError(event: BrowserTaskEvent): Error {
  return browserAuthorizationLifecycleError(event.Data, event.Message || '浏览器任务失败')
}

async function requestBrowserExtensionSnapshot(
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
    let timer: number | undefined
    let offData = () => {}
    let offError = () => {}
    let offEnd = () => {}
    const finish = (handler: () => void) => {
      if (settled) return
      settled = true
      if (timer !== undefined) window.clearTimeout(timer)
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
    timer = window.setTimeout(() => {
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

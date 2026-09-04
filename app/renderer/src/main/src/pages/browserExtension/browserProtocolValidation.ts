const BROWSER_TASK_PAYLOAD_MAX_BYTES = 256 * 1024
const BROWSER_TASK_EVENT_MAX_BYTES = 1024 * 1024
const BROWSER_PROTOCOL_MAX_DEPTH = 64
const BROWSER_PROTOCOL_MAX_NODES = 50_000

type JSONObject = Record<string, unknown>

export interface ValidatedBrowserTaskEvent {
  TaskId?: string
  DeviceId?: string
  Type: 'queued' | 'running' | 'log' | 'result' | 'warning' | 'error' | 'cancelled' | 'completed'
  Message?: string
  Data?: Uint8Array
  Timestamp?: number
  Sequence?: number
}

export class BrowserProtocolValidationError extends Error {
  readonly code = 'browser_protocol_schema_mismatch'

  constructor(
    public readonly schema: string,
    public readonly path: string,
    expected: string,
  ) {
    super(
      `浏览器协议 v3 / ${schema} 在 ${path} 不匹配：应为${expected}。请刷新连接，并确认 Yak、Yakit 与插件来自同一版本。`,
    )
    this.name = 'BrowserProtocolValidationError'
  }
}

function fail(schema: string, path: string, expected: string): never {
  throw new BrowserProtocolValidationError(schema, path, expected)
}

function objectValue(value: unknown, schema: string, path: string): JSONObject {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(schema, path, '对象')
  return value as JSONObject
}

function strictKeys(value: JSONObject, allowed: readonly string[], schema: string, path: string): void {
  const allowedKeys = new Set(allowed)
  for (const key of Object.keys(value)) {
    if (!allowedKeys.has(key)) fail(schema, `${path}.${key}`, '协议中声明的字段')
  }
}

function requiredString(value: JSONObject, key: string, schema: string, path: string): string {
  const result = value[key]
  if (typeof result !== 'string' || !result) fail(schema, `${path}.${key}`, '非空字符串')
  return result
}

function optionalString(value: JSONObject, key: string, schema: string, path: string): string | undefined {
  const result = value[key]
  if (result === undefined) return undefined
  if (typeof result !== 'string') fail(schema, `${path}.${key}`, '字符串')
  return result
}

function requiredNumber(value: JSONObject, key: string, schema: string, path: string): number {
  const result = value[key]
  if (typeof result !== 'number' || !Number.isFinite(result)) fail(schema, `${path}.${key}`, '有限数字')
  return result
}

function optionalProtobufUnsignedInteger(
  value: JSONObject,
  key: string,
  schema: string,
  path: string,
): number | undefined {
  const raw = value[key]
  if (raw === undefined) return undefined
  const result =
    typeof raw === 'number' ? raw : typeof raw === 'string' && /^(0|[1-9]\d*)$/.test(raw) ? Number(raw) : Number.NaN
  if (!Number.isSafeInteger(result) || result < 0) {
    fail(schema, `${path}.${key}`, '安全整数范围内的非负整数')
  }
  return result
}

function requiredBoolean(value: JSONObject, key: string, schema: string, path: string): boolean {
  const result = value[key]
  if (typeof result !== 'boolean') fail(schema, `${path}.${key}`, '布尔值')
  return result
}

function collection(value: JSONObject, key: string, schema: string, path: string): unknown[] {
  const result = value[key]
  if (result === undefined || result === null) return []
  if (!Array.isArray(result)) fail(schema, `${path}.${key}`, '数组或空值')
  return result
}

function stringCollection(value: JSONObject, key: string, schema: string, path: string): string[] {
  return collection(value, key, schema, path).map((item, index) => {
    if (typeof item !== 'string') fail(schema, `${path}.${key}[${index}]`, '字符串')
    return item
  })
}

function objectCollection<T>(
  value: JSONObject,
  key: string,
  schema: string,
  path: string,
  normalize: (item: JSONObject, itemPath: string) => T,
): T[] {
  return collection(value, key, schema, path).map((item, index) =>
    normalize(objectValue(item, schema, `${path}.${key}[${index}]`), `${path}.${key}[${index}]`),
  )
}

function validateJSONTree(value: unknown, schema: string): void {
  let nodes = 0
  const visit = (current: unknown, path: string, depth: number): void => {
    nodes += 1
    if (nodes > BROWSER_PROTOCOL_MAX_NODES) fail(schema, path, `不超过 ${BROWSER_PROTOCOL_MAX_NODES} 个节点的数据`)
    if (depth > BROWSER_PROTOCOL_MAX_DEPTH) fail(schema, path, `深度不超过 ${BROWSER_PROTOCOL_MAX_DEPTH} 的数据`)
    if (!current || typeof current !== 'object') return
    if (Array.isArray(current)) {
      current.forEach((item, index) => visit(item, `${path}[${index}]`, depth + 1))
      return
    }
    for (const [key, item] of Object.entries(current as JSONObject)) {
      if (key === '__proto__' || key === 'prototype' || key === 'constructor') {
        fail(schema, `${path}.${key}`, '不包含原型污染字段的数据')
      }
      visit(item, `${path}.${key}`, depth + 1)
    }
  }
  visit(value, '$', 0)
}

function parseBoundedJSON(raw: string, schema: string): unknown {
  if (new TextEncoder().encode(raw).byteLength > BROWSER_TASK_EVENT_MAX_BYTES) {
    fail(schema, '$', `不超过 ${BROWSER_TASK_EVENT_MAX_BYTES} 字节的 JSON`)
  }
  let value: unknown
  try {
    value = JSON.parse(raw)
  } catch {
    fail(schema, '$', '有效 JSON')
  }
  validateJSONTree(value, schema)
  return value
}

function normalizeCapabilityDescriptor(value: JSONObject, schema: string, path: string): JSONObject {
  strictKeys(
    value,
    [
      'method',
      'domain',
      'access',
      'agentVisible',
      'summary',
      'scopes',
      'conditionalScopes',
      'targetMode',
      'defaultTimeoutMs',
      'paramsSchema',
    ],
    schema,
    path,
  )
  requiredString(value, 'method', schema, path)
  requiredString(value, 'domain', schema, path)
  requiredString(value, 'access', schema, path)
  if (value.agentVisible !== undefined) requiredBoolean(value, 'agentVisible', schema, path)
  requiredString(value, 'summary', schema, path)
  requiredString(value, 'targetMode', schema, path)
  requiredNumber(value, 'defaultTimeoutMs', schema, path)
  objectValue(value.paramsSchema, schema, `${path}.paramsSchema`)
  const conditionalScopes = objectCollection(value, 'conditionalScopes', schema, path, (item, itemPath) => {
    strictKeys(item, ['scope', 'when'], schema, itemPath)
    requiredString(item, 'scope', schema, itemPath)
    requiredString(item, 'when', schema, itemPath)
    return item
  })
  return { ...value, scopes: stringCollection(value, 'scopes', schema, path), conditionalScopes }
}

function normalizeConnection(value: JSONObject, schema: string, path: string): JSONObject {
  strictKeys(
    value,
    [
      'deviceId',
      'installationId',
      'managedInstance',
      'client',
      'clientVersion',
      'capabilities',
      'capabilityCatalog',
      'sessionId',
      'connectionId',
      'taskId',
      'grantId',
      'connectedAt',
    ],
    schema,
    path,
  )
  for (const key of ['deviceId', 'installationId', 'client', 'clientVersion', 'sessionId', 'connectionId']) {
    requiredString(value, key, schema, path)
  }
  optionalString(value, 'taskId', schema, path)
  optionalString(value, 'grantId', schema, path)
  requiredNumber(value, 'connectedAt', schema, path)
  let managedInstance = value.managedInstance
  if (managedInstance !== undefined && managedInstance !== null) {
    const managed = objectValue(managedInstance, schema, `${path}.managedInstance`)
    strictKeys(managed, ['manager', 'instanceId', 'badge'], schema, `${path}.managedInstance`)
    const manager = requiredString(managed, 'manager', schema, `${path}.managedInstance`)
    const instanceId = requiredString(managed, 'instanceId', schema, `${path}.managedInstance`)
    const badge = requiredString(managed, 'badge', schema, `${path}.managedInstance`)
    if (!['ytray', 'yakit'].includes(manager)) fail(schema, `${path}.managedInstance.manager`, 'ytray 或 yakit')
    if (!/^[A-Za-z0-9-]{1,160}$/.test(instanceId)) {
      fail(schema, `${path}.managedInstance.instanceId`, '安全的实例 ID')
    }
    if (!/^[A-Z]{1,2}$/.test(badge)) fail(schema, `${path}.managedInstance.badge`, '一至两个大写字母')
    managedInstance = { manager, instanceId, badge }
  }
  let capabilityCatalog = value.capabilityCatalog
  if (capabilityCatalog !== undefined && capabilityCatalog !== null) {
    const catalog = objectValue(capabilityCatalog, schema, `${path}.capabilityCatalog`)
    strictKeys(catalog, ['version', 'schemaDialect', 'hash', 'capabilities'], schema, `${path}.capabilityCatalog`)
    if (requiredNumber(catalog, 'version', schema, `${path}.capabilityCatalog`) !== 1) {
      fail(schema, `${path}.capabilityCatalog.version`, '版本 1')
    }
    if (
      requiredString(catalog, 'schemaDialect', schema, `${path}.capabilityCatalog`) !==
      'http://json-schema.org/draft-07/schema#'
    ) {
      fail(schema, `${path}.capabilityCatalog.schemaDialect`, 'JSON Schema draft-07')
    }
    const hash = requiredString(catalog, 'hash', schema, `${path}.capabilityCatalog`)
    if (!/^[a-f0-9]{64}$/.test(hash)) fail(schema, `${path}.capabilityCatalog.hash`, '64 位小写 SHA-256')
    capabilityCatalog = {
      ...catalog,
      capabilities: objectCollection(catalog, 'capabilities', schema, `${path}.capabilityCatalog`, (item, itemPath) =>
        normalizeCapabilityDescriptor(item, schema, itemPath),
      ),
    }
  }
  return {
    ...value,
    managedInstance,
    capabilities: stringCollection(value, 'capabilities', schema, path),
    capabilityCatalog,
  }
}

function normalizeBridgeStatus(value: JSONObject, schema: string): JSONObject {
  strictKeys(
    value,
    [
      'revision',
      'running',
      'connected',
      'url',
      'lastError',
      'protocolVersion',
      'engineIdentityId',
      'engineInstanceId',
      'pairingOpenUntil',
      'connections',
    ],
    schema,
    '$',
  )
  requiredNumber(value, 'revision', schema, '$')
  requiredBoolean(value, 'running', schema, '$')
  requiredBoolean(value, 'connected', schema, '$')
  optionalString(value, 'url', schema, '$')
  optionalString(value, 'lastError', schema, '$')
  if (requiredNumber(value, 'protocolVersion', schema, '$') !== 3) fail(schema, '$.protocolVersion', '版本 3')
  requiredString(value, 'engineIdentityId', schema, '$')
  requiredString(value, 'engineInstanceId', schema, '$')
  if (value.pairingOpenUntil !== undefined) requiredNumber(value, 'pairingOpenUntil', schema, '$')
  return {
    ...value,
    connections: objectCollection(value, 'connections', schema, '$', (item, path) =>
      normalizeConnection(item, schema, path),
    ),
  }
}

function normalizePairingRequest(value: JSONObject, schema: string): JSONObject {
  strictKeys(
    value,
    [
      'id',
      'installationId',
      'managedInstance',
      'extensionId',
      'client',
      'clientVersion',
      'origin',
      'code',
      'createdAt',
      'expiresAt',
    ],
    schema,
    '$',
  )
  for (const key of ['id', 'installationId', 'extensionId', 'client', 'clientVersion', 'origin', 'code']) {
    requiredString(value, key, schema, '$')
  }
  requiredNumber(value, 'createdAt', schema, '$')
  requiredNumber(value, 'expiresAt', schema, '$')
  let managedInstance = value.managedInstance
  if (managedInstance !== undefined && managedInstance !== null) {
    const managed = objectValue(managedInstance, schema, '$.managedInstance')
    strictKeys(managed, ['manager', 'instanceId', 'badge'], schema, '$.managedInstance')
    const manager = requiredString(managed, 'manager', schema, '$.managedInstance')
    const instanceId = requiredString(managed, 'instanceId', schema, '$.managedInstance')
    const badge = requiredString(managed, 'badge', schema, '$.managedInstance')
    if (!['ytray', 'yakit'].includes(manager)) fail(schema, '$.managedInstance.manager', 'ytray 或 yakit')
    if (!/^[A-Za-z0-9-]{1,160}$/.test(instanceId)) fail(schema, '$.managedInstance.instanceId', '安全的实例 ID')
    if (!/^[A-Z]{1,2}$/.test(badge)) fail(schema, '$.managedInstance.badge', '一至两个大写字母')
    managedInstance = { manager, instanceId, badge }
  }
  return { ...value, managedInstance }
}

function normalizeDevice(value: JSONObject, schema: string): JSONObject {
  strictKeys(
    value,
    ['id', 'installationId', 'name', 'client', 'clientVersion', 'origin', 'publicKey', 'createdAt', 'lastSeenAt'],
    schema,
    '$',
  )
  for (const key of ['id', 'installationId', 'name', 'client', 'clientVersion', 'origin']) {
    requiredString(value, key, schema, '$')
  }
  objectValue(value.publicKey, schema, '$.publicKey')
  requiredNumber(value, 'createdAt', schema, '$')
  requiredNumber(value, 'lastSeenAt', schema, '$')
  return value
}

export function decodeBrowserSnapshotResource(resourceType: string, encoded: string): JSONObject {
  const schema = `snapshot.${resourceType}`
  const value = objectValue(parseBoundedJSON(encoded, schema), schema, '$')
  if (resourceType === 'status') return normalizeBridgeStatus(value, schema)
  if (resourceType === 'pairing-request') return normalizePairingRequest(value, schema)
  if (resourceType === 'paired-device') return normalizeDevice(value, schema)
  fail(schema, '$', '已知的浏览器快照资源类型')
}

export function browserSnapshotResources(response: unknown): JSONObject[] {
  const schema = 'snapshot.response'
  const value = objectValue(response, schema, '$')
  const resources = value.Resources
  if (resources === undefined || resources === null) return []
  if (!Array.isArray(resources)) fail(schema, '$.Resources', '数组或空值')
  return resources.map((resource, index) => {
    const item = objectValue(resource, schema, `$.Resources[${index}]`)
    requiredString(item, 'ResourceType', schema, `$.Resources[${index}]`)
    const extra = item.Extra
    if (extra !== undefined && extra !== null && !Array.isArray(extra)) {
      fail(schema, `$.Resources[${index}].Extra`, '数组或空值')
    }
    return item
  })
}

export function validateBrowserTaskEvent(input: unknown): ValidatedBrowserTaskEvent {
  const schema = 'browser.task.event'
  const value = objectValue(input, schema, '$')
  const type = requiredString(value, 'Type', schema, '$')
  if (!['queued', 'running', 'log', 'result', 'warning', 'error', 'cancelled', 'completed'].includes(type)) {
    fail(schema, '$.Type', '已声明的任务事件类型')
  }
  for (const key of ['TaskId', 'DeviceId', 'Message']) optionalString(value, key, schema, '$')
  const timestamp = optionalProtobufUnsignedInteger(value, 'Timestamp', schema, '$')
  const sequence = optionalProtobufUnsignedInteger(value, 'Sequence', schema, '$')
  if (value.Data !== undefined && !(value.Data instanceof Uint8Array)) {
    fail(schema, '$.Data', 'Uint8Array')
  }
  if (value.Data instanceof Uint8Array && value.Data.byteLength > BROWSER_TASK_EVENT_MAX_BYTES) {
    fail(schema, '$.Data', `不超过 ${BROWSER_TASK_EVENT_MAX_BYTES} 字节`)
  }
  return {
    ...value,
    Timestamp: timestamp,
    Sequence: sequence,
  } as unknown as ValidatedBrowserTaskEvent
}

function normalizeIsolationInspection(value: unknown, schema: string): JSONObject {
  const result = objectValue(value, schema, '$')
  requiredString(result, 'browser', schema, '$')
  objectValue(result.capabilities, schema, '$.capabilities')
  return {
    ...result,
    contexts: collection(result, 'contexts', schema, '$').map((item, index) =>
      objectValue(item, schema, `$.contexts[${index}]`),
    ),
    tabs: collection(result, 'tabs', schema, '$').map((item, index) => objectValue(item, schema, `$.tabs[${index}]`)),
  }
}

function normalizeCapabilityResult(method: string, value: unknown): unknown {
  const schema = `capability.${method || 'unknown'}`
  const objectList = (input: unknown, normalize?: (item: JSONObject, path: string) => JSONObject): JSONObject[] => {
    if (input === undefined || input === null) return []
    if (!Array.isArray(input)) fail(schema, '$', '数组或空值')
    return input.map((item, index) => {
      const path = `$[${index}]`
      const record = objectValue(item, schema, path)
      return normalize ? normalize(record, path) : record
    })
  }
  const normalizeProfile = (item: JSONObject, path: string): JSONObject => {
    requiredString(item, 'id', schema, path)
    requiredString(item, 'name', schema, path)
    const target = objectValue(item.target, schema, `${path}.target`)
    const match = objectValue(item.match, schema, `${path}.match`)
    const request = objectValue(item.request, schema, `${path}.request`)
    return {
      ...item,
      target,
      match: { ...match, methods: stringCollection(match, 'methods', schema, `${path}.match`) },
      request: { ...request, nodes: collection(request, 'nodes', schema, `${path}.request`) },
    }
  }
  if (method === 'browser.transform.profile.list') return objectList(value, normalizeProfile)
  if (method === 'browser.authorization.baseline.candidates')
    return objectList(value, (item, path) => {
      requiredString(item, 'id', schema, path)
      requiredBoolean(item, 'eligible', schema, path)
      return { ...item, reasons: stringCollection(item, 'reasons', schema, path) }
    })
  if (['browser.tabs', 'browser.isolation.container.list', 'browser.callable.list'].includes(method)) {
    return objectList(value)
  }
  if (method.endsWith('.list')) {
    if (value === undefined || value === null) return []
    if (!Array.isArray(value)) fail(schema, '$', '数组或空值')
    return value
  }
  if (method === 'browser.isolation.inspect') return normalizeIsolationInspection(value, schema)
  if (method === 'browser.recording.get') {
    const result = objectValue(value, schema, '$')
    const records = (key: string) =>
      collection(result, key, schema, '$').map((item, index) => objectValue(item, schema, `$.${key}[${index}]`))
    return {
      ...result,
      events: records('events'),
      traces: records('traces'),
      links: records('links'),
      callables: records('callables'),
      profileCandidates: records('profileCandidates'),
    }
  }
  if (method === 'browser.transform.profile.save') {
    return normalizeProfile(objectValue(value, schema, '$'), '$')
  }
  if (method === 'browser.isolation.container.open') {
    const result = objectValue(value, schema, '$')
    const container = objectValue(result.container, schema, '$.container')
    requiredString(container, 'cookieStoreId', schema, '$.container')
    requiredString(container, 'name', schema, '$.container')
    return { ...result, container }
  }
  if (method === 'browser.profile.validation.latest') {
    if (value === undefined || value === null) return null
    const result = objectValue(value, schema, '$')
    requiredNumber(result, 'contractVersion', schema, '$')
    requiredString(result, 'id', schema, '$')
    const profile = objectValue(result.profile, schema, '$.profile')
    objectValue(profile.target, schema, '$.profile.target')
    requiredString(profile, 'failMode', schema, '$.profile')
    return { ...result, profile }
  }
  return value
}

export function encodeBrowserTaskPayload(payload: Record<string, unknown>, schema: string): Uint8Array {
  let encoded: string
  try {
    const candidate = JSON.stringify(payload)
    if (typeof candidate !== 'string') fail(schema, '$', '可序列化的 JSON 对象')
    encoded = candidate
  } catch {
    fail(schema, '$', '可序列化的 JSON 对象')
  }
  const bytes = new TextEncoder().encode(encoded)
  if (bytes.byteLength > BROWSER_TASK_PAYLOAD_MAX_BYTES) {
    fail(schema, '$', `不超过 ${BROWSER_TASK_PAYLOAD_MAX_BYTES} 字节的请求`)
  }
  return bytes
}

export function decodeBrowserTaskResult(schema: string, payload: Record<string, unknown>, raw: string): unknown {
  const value = parseBoundedJSON(raw || 'null', schema)
  if (schema === 'capability.call') {
    const method = typeof payload.method === 'string' ? payload.method : ''
    return normalizeCapabilityResult(method, value)
  }
  validateJSONTree(value, schema)
  return value
}

export interface BrowserTransformAdapterStatus {
  running: boolean
  endpoint: string
  token: string
  deviceId: string
  profileId: string
  profileName: string
  requestEnabled: boolean
  responseEnabled: boolean
  startedAt: number
  requestCount: number
  bypassCount: number
  failureCount: number
  lastUsedAt: number
  lastError: string
  port: number
  host: string
  timeoutMilliseconds: number
  protocolVersion: string
  methods: string[]
  urlPattern: string
  origin: string
}

export function normalizeBrowserTransformAdapterStatus(value: unknown): BrowserTransformAdapterStatus {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
  const text = (name: string) => (typeof source[name] === 'string' ? (source[name] as string) : '')
  const number = (name: string) => {
    const raw = source[name]
    const parsed = typeof raw === 'number' ? raw : typeof raw === 'string' && /^\d+$/.test(raw) ? Number(raw) : 0
    return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : 0
  }
  return {
    running: source.Running === true,
    endpoint: text('Endpoint'),
    token: text('Token'),
    deviceId: text('DeviceId'),
    profileId: text('ProfileId'),
    profileName: text('ProfileName'),
    requestEnabled: source.RequestEnabled === true,
    responseEnabled: source.ResponseEnabled === true,
    startedAt: number('StartedAt'),
    requestCount: number('RequestCount'),
    bypassCount: number('BypassCount'),
    failureCount: number('FailureCount'),
    lastUsedAt: number('LastUsedAt'),
    lastError: text('LastError'),
    port: number('Port'),
    host: text('Host'),
    timeoutMilliseconds: number('TimeoutMilliseconds'),
    protocolVersion: text('ProtocolVersion'),
    methods: Array.isArray(source.Methods)
      ? source.Methods.filter((item): item is string => typeof item === 'string')
      : [],
    urlPattern: text('UrlPattern'),
    origin: text('Origin'),
  }
}

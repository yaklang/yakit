import { serializeError } from '../../shared/communication/errors'
import type { BridgeEvent, GrpcApi, Reply, Request } from '../../shared/communication/protocol'
import type { createGrpcMethods } from './grpc'
import { StreamManager, type StreamFactory } from './streams'

export interface InvocationContext {
  owner: string
  signal: AbortSignal
  request: Request
  progress(data: unknown): void
  event?: unknown
}
export type LocalHandler = (params: unknown, context: InvocationContext) => unknown | Promise<unknown>
type Pending = { abort(): void; namespace: string; api: string }

export class Router {
  readonly streams: StreamManager
  private readonly pending = new Map<string, Pending>()
  private readonly local = new Map<string, LocalHandler>()
  private readonly adapters = new Map<string, StreamFactory>()

  constructor(
    private readonly grpc: ReturnType<typeof createGrpcMethods>,
    private readonly allowed: (owner: string, namespace: 'grpc' | 'local', api: string) => boolean,
    private readonly emit: (owner: string, event: BridgeEvent) => void,
    private readonly log: (error: unknown) => void = console.error,
    ownerGroup?: (owner: string) => string,
  ) {
    this.streams = new StreamManager(emit, undefined, ownerGroup)
  }

  registerLocal(api: string, handler: LocalHandler) {
    if (this.local.has(api)) throw new Error(`Duplicate local method: ${api}`)
    this.local.set(api, handler)
  }
  registerStream(api: GrpcApi, factory: StreamFactory) {
    this.adapters.set(api, factory)
  }

  async handle(owner: string, input: unknown, event?: unknown): Promise<Reply> {
    let request: Request = { requestId: '', namespace: 'local', api: '', action: 'call' }
    try {
      request = this.validate(input)
      if (!this.allowed(owner, request.namespace, request.api))
        throw new Error('Method is not allowed for this renderer')
      if (request.action === 'abort') {
        const target = this.pending.get(`${owner}:${request.targetRequestId}`)
        if (target?.api === request.api && target.namespace === request.namespace) target.abort()
        this.streams.cancelRequest(owner, request.targetRequestId ?? '', request.api, request.namespace)
        return { ok: true, data: undefined }
      }
      if (['write', 'end', 'cancel', 'ack', 'detach'].includes(request.action)) {
        if (request.namespace !== 'grpc') throw new Error('Local streaming is not supported')
        await this.streams.command(owner, request)
        return { ok: true, data: undefined }
      }
      // Registration occurs synchronously before any await, so ordered IPC aborts cannot overtake it.
      const key = `${owner}:${request.requestId}`
      if (this.pending.has(key)) throw new Error('Duplicate requestId')
      const controller = new AbortController()
      let cancelBackend: (() => void) | undefined
      let rejectAbort!: (error: unknown) => void
      const aborted = new Promise<never>((_resolve, reject) => {
        rejectAbort = reject
      })
      const abort = (timeout = false) => {
        if (controller.signal.aborted) return
        controller.abort()
        cancelBackend?.()
        this.streams.cancelRequest(owner, request.requestId, request.api, request.namespace)
        rejectAbort(
          Object.assign(new Error(timeout ? 'Operation timed out' : 'Operation aborted'), {
            code: timeout ? 'DEADLINE_EXCEEDED' : 'ABORTED',
          }),
        )
      }
      const pending = { abort, namespace: request.namespace, api: request.api }
      this.pending.set(key, pending)
      const timer = request.timeoutMs === undefined ? undefined : setTimeout(() => abort(true), request.timeoutMs)
      try {
        let work: Promise<unknown>
        if (request.action === 'open') {
          if (request.namespace !== 'grpc') throw new Error('Local streaming is not supported')
          if (request.api === 'SubscribeHTTPFlows') {
            const params = request.params
            if (
              !params ||
              typeof params !== 'object' ||
              !('SessionId' in params) ||
              params.SessionId !== request.token
            ) {
              throw new Error('HTTP flow subscription session does not match its stream token')
            }
          }
          const factory = this.adapters.get(request.api) ?? this.grpc.stream(request.api as GrpcApi)
          work = this.streams.open(owner, request, factory)
        } else if (request.namespace === 'grpc') {
          work = new Promise((resolve, reject) => {
            const call = this.grpc.unary(request.api as GrpcApi, request.params, (error, data) =>
              error ? reject(error) : resolve(data),
            )
            cancelBackend = () => call.cancel()
          })
        } else {
          const handler = this.local.get(request.api)
          const context: InvocationContext = {
            owner,
            signal: controller.signal,
            request,
            event,
            progress: (data) => {
              if (controller.signal.aborted || this.pending.get(key) !== pending) return
              this.emit(owner, {
                type: 'progress',
                namespace: 'local',
                api: request.api,
                requestId: request.requestId,
                data,
              })
            },
          }
          if (handler) work = Promise.resolve(handler(request.params, context))
          else throw new Error(`Unknown local method: ${request.api}`)
        }
        const data = await Promise.race([work, aborted])
        return { ok: true, data }
      } finally {
        clearTimeout(timer)
        this.pending.delete(key)
      }
    } catch (error) {
      this.log(error)
      const record = error && typeof error === 'object' ? (error as Record<string, unknown>) : {}
      const source = typeof record.code === 'number' && typeof record.details === 'string' ? 'grpc' : request.namespace
      return {
        ok: false,
        error: serializeError(error, source, request.requestId, `${request.namespace}.${request.api}`),
      }
    }
  }

  private validate(input: unknown): Request {
    if (!input || typeof input !== 'object') throw new Error('Invalid IPC request')
    const value = input as Record<string, unknown>
    if (typeof value.requestId !== 'string' || !/^[\w-]{1,128}$/.test(value.requestId))
      throw new Error('Invalid requestId')
    if (value.namespace !== 'grpc' && value.namespace !== 'local') throw new Error('Invalid namespace')
    if (typeof value.api !== 'string' || value.api.length === 0 || value.api.length > 256)
      throw new Error('Invalid API')
    if (!['call', 'open', 'write', 'end', 'cancel', 'ack', 'abort', 'detach'].includes(String(value.action)))
      throw new Error('Invalid action')
    if (
      value.timeoutMs !== undefined &&
      (typeof value.timeoutMs !== 'number' ||
        !Number.isFinite(value.timeoutMs) ||
        value.timeoutMs <= 0 ||
        value.timeoutMs > 2 ** 31 - 1)
    )
      throw new Error('Invalid timeoutMs')
    for (const field of ['token', 'instanceId', 'targetRequestId'])
      if (
        value[field] !== undefined &&
        (typeof value[field] !== 'string' || !/^[\w:-]{1,128}$/.test(value[field] as string))
      )
        throw new Error(`Invalid ${field}`)
    if (value.ack !== undefined && (typeof value.ack !== 'number' || !Number.isSafeInteger(value.ack) || value.ack < 1))
      throw new Error('Invalid acknowledgement')
    if (
      value.resume !== undefined &&
      (typeof value.resume !== 'boolean' || value.action !== 'open' || !['MITM', 'MITMV2'].includes(String(value.api)))
    )
      throw new Error('Invalid stream resume')
    return value as unknown as Request
  }

  closeOwner(owner: string, preserveMITM = false) {
    for (const [key, pending] of this.pending) if (key.startsWith(`${owner}:`)) pending.abort()
    this.streams.cancelOwner(owner, preserveMITM)
  }
  engineChanged() {
    for (const pending of this.pending.values()) if (pending.namespace === 'grpc') pending.abort()
    this.streams.cancelAll()
  }
}

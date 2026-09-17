import type { BridgeEvent, Request, StreamEvent } from '../../shared/communication/protocol'
import { serializeError } from '../../shared/communication/errors'

export interface GrpcStream {
  on(name: 'data', listener: (data: unknown) => void): this
  on(name: 'error', listener: (error: unknown) => void): this
  on(name: 'end', listener: () => void): this
  cancel(): void
  write?(data: unknown, callback: (error?: Error | null) => void): boolean
  end?(): void
  pause?(): void
  resume?(): void
}
export interface StreamFactory {
  requestStream: boolean
  responseStream: boolean
  // Duplex adapters such as MITM must reserve/control their own read capacity.
  pauseable: boolean
  persistent?: boolean
  isControl?(data: unknown): boolean
  snapshotKey?(data: unknown): string | undefined
  prepare?(params: unknown, signal: AbortSignal): Promise<unknown>
  create(params: unknown, callback: (error: unknown, data?: unknown) => void): GrpcStream
  initialize?(params: unknown, write: (params: unknown) => Promise<void>): Promise<void>
  // 流创建后、绑定监听前调用；owner 为发起窗口的会话标识，可映射到 BrowserWindow。
  onStream?(owner: string, stream: GrpcStream): void
}
export interface StreamLimits {
  maxBytes: number
  maxItems: number
  batchItems: number
  batchBytes: number
  maxPendingWrites: number
  writeTimeoutMs: number
}
export const defaultStreamLimits: StreamLimits = {
  maxBytes: 16 * 1024 * 1024,
  maxItems: 1024,
  batchItems: 32,
  batchBytes: 256 * 1024,
  maxPendingWrites: 128,
  writeTimeoutMs: 30_000,
}

/** Estimate structured-clone payload size without JSON/base64 copies of binary packets. */
export function payloadBytes(value: unknown, seen = new Set<object>()): number {
  if (typeof value === 'string') return Buffer.byteLength(value)
  if (typeof value === 'number' || typeof value === 'bigint') return 8
  if (value === null || typeof value !== 'object') return 1
  if (ArrayBuffer.isView(value)) return value.byteLength
  if (value instanceof ArrayBuffer) return value.byteLength
  if (seen.has(value)) return 0
  seen.add(value)
  let size = 0
  for (const [key, child] of Object.entries(value)) size += Buffer.byteLength(key) + payloadBytes(child, seen)
  return size
}

type Job = { action: 'write' | 'end'; params?: unknown; resolve(): void; reject(error: unknown): void; bytes: number }
type State = {
  owner: string
  group: string
  detached: boolean
  request: Request & { token: string; instanceId: string }
  factory: StreamFactory
  controller: AbortController
  stream?: GrpcStream
  terminal: boolean
  ended: boolean
  paused: boolean
  sequence: number
  queue: { data: unknown; bytes: number; control: boolean }[]
  inflight: Map<number, { bytes: number; count: number; items: unknown[]; normalBytes: number; normalCount: number }>
  bytes: number
  count: number
  normalBytes: number
  normalCount: number
  jobs: Job[]
  active?: Job
  writeBytes: number
  timer?: ReturnType<typeof setTimeout>
  flushScheduled: boolean
  final?: StreamEvent
  writeTimer?: ReturnType<typeof setTimeout>
}

export class StreamManager {
  private readonly states = new Map<string, State>()
  constructor(
    private readonly emit: (owner: string, event: BridgeEvent) => void,
    private readonly limits: StreamLimits = defaultStreamLimits,
    private readonly ownerGroup: (owner: string) => string = (owner) => owner,
  ) {}

  private key(owner: string, token: string) {
    return `${owner}:${token}`
  }
  private event(state: State) {
    const { namespace, api, token, instanceId } = state.request
    return { namespace, api, token, instanceId }
  }
  private current(owner: string, request: Request) {
    const state = this.states.get(this.key(owner, request.token || ''))
    return state &&
      !state.detached &&
      state.request.instanceId === request.instanceId &&
      state.request.api === request.api &&
      state.request.namespace === request.namespace
      ? state
      : undefined
  }

  async open(owner: string, request: Request, factory: StreamFactory) {
    const { token, instanceId } = request
    if (!token || !instanceId || !/^[\w:-]{1,128}$/.test(token) || !/^[\w-]{1,128}$/.test(instanceId))
      throw new Error('Invalid stream identity')
    const key = this.key(owner, token)
    if (this.states.has(key)) throw new Error('Token already has a live stream')
    const group = this.ownerGroup(owner)
    const persistent = [...this.states.values()].find(
      (state) => state.group === group && state.factory.persistent && state.request.api === request.api,
    )
    if (request.resume) {
      if (!factory.persistent || !persistent || !persistent.detached)
        throw new Error('No detached MITM session for this window')
      this.states.delete(this.key(persistent.owner, persistent.request.token))
      persistent.owner = owner
      persistent.request = { ...persistent.request, ...request, params: persistent.request.params, token, instanceId }
      persistent.detached = false
      persistent.sequence = 0
      this.states.set(key, persistent)
      this.flush(persistent)
      return
    }
    if (factory.persistent && persistent) throw new Error('MITM session already exists for this window')
    const state: State = {
      owner,
      group,
      detached: false,
      request: { ...request, token, instanceId },
      factory,
      controller: new AbortController(),
      terminal: false,
      ended: false,
      paused: false,
      sequence: 0,
      queue: [],
      inflight: new Map(),
      bytes: 0,
      count: 0,
      normalBytes: 0,
      normalCount: 0,
      jobs: [],
      writeBytes: 0,
      flushScheduled: false,
    }
    this.states.set(key, state)
    try {
      const params = factory.prepare ? await factory.prepare(request.params, state.controller.signal) : request.params
      if (state.terminal) return
      const stream = factory.create(params, (error, data) => {
        if (error) this.fail(state, error)
        else this.finish(state, { ...this.event(state), type: 'result', data })
      })
      state.stream = stream
      factory.onStream?.(owner, stream)
      // A synchronous completion during creation is legal for an adapter.
      if (state.terminal) {
        stream.on('error', () => {})
        stream.cancel()
        return
      }
      stream.on('error', (error) => this.fail(state, error))
      if (factory.responseStream) {
        stream.on('data', (data) => this.enqueue(state, data))
        stream.on('end', () => this.finish(state, { ...this.event(state), type: 'end' }))
      }
      if (factory.initialize)
        await factory.initialize(params, (params) => this.command(owner, { ...request, action: 'write', params }))
      else if (factory.requestStream && request.params !== undefined)
        await this.command(owner, { ...request, action: 'write' })
    } catch (error) {
      this.remove(state, error)
      throw error
    }
  }

  private enqueue(state: State, data: unknown) {
    if (state.terminal || state.final) return
    const bytes = payloadBytes(data)
    const control = state.factory.isControl?.(data) ?? true
    const snapshotKey = state.factory.snapshotKey?.(data)
    const previous = snapshotKey
      ? state.queue.findIndex((item) => state.factory.snapshotKey?.(item.data) === snapshotKey)
      : -1
    if (previous !== -1) {
      const [old] = state.queue.splice(previous, 1)
      state.bytes -= old.bytes
      state.count--
      if (!old.control) {
        state.normalBytes -= old.bytes
        state.normalCount--
      }
    }
    // MITM 的普通数据只能占一半容量，为劫持和状态控制保留空间。
    if (
      state.bytes + bytes > this.limits.maxBytes ||
      state.count + 1 > this.limits.maxItems ||
      (!control &&
        (state.normalBytes + bytes > this.limits.maxBytes / 2 || state.normalCount + 1 > this.limits.maxItems / 2))
    ) {
      this.fail(
        state,
        Object.assign(new Error('Stream consumer exceeded queue capacity'), { code: 'RESOURCE_EXHAUSTED' }),
      )
      return
    }
    state.queue.push({ data, bytes, control })
    state.bytes += bytes
    state.count++
    if (!control) {
      state.normalBytes += bytes
      state.normalCount++
    }
    this.backpressure(state)
    if (!state.flushScheduled) {
      state.flushScheduled = true
      state.timer = setTimeout(() => this.flush(state), 0)
    }
  }

  private flush(state: State) {
    clearTimeout(state.timer)
    state.flushScheduled = false
    if (state.terminal || state.detached) return
    while (state.queue.length) {
      const items: unknown[] = []
      let bytes = 0
      let normalBytes = 0
      let normalCount = 0
      while (state.queue.length && items.length < this.limits.batchItems) {
        const next = state.queue[0]
        if (items.length && bytes + next.bytes > this.limits.batchBytes) break
        state.queue.shift()
        items.push(next.data)
        bytes += next.bytes
        if (!next.control) {
          normalBytes += next.bytes
          normalCount++
        }
      }
      const sequence = ++state.sequence
      // Count sent, unacknowledged batches against capacity too.
      state.inflight.set(sequence, { bytes, count: items.length, items, normalBytes, normalCount })
      this.emit(state.owner, { ...this.event(state), type: 'data', sequence, items })
    }
    if (state.final && state.inflight.size === 0) {
      const final = state.final
      this.remove(state)
      this.emit(state.owner, final)
    }
  }

  private backpressure(state: State) {
    if (!state.factory.pauseable) return
    if (!state.paused && (state.bytes >= this.limits.maxBytes / 2 || state.count >= this.limits.maxItems / 2)) {
      state.paused = true
      state.stream?.pause?.()
    } else if (state.paused && state.bytes < this.limits.maxBytes / 4 && state.count < this.limits.maxItems / 4) {
      state.paused = false
      state.stream?.resume?.()
    }
  }

  private finish(state: State, event: StreamEvent) {
    if (state.terminal || state.final) return
    state.final = event
    if (state.detached) {
      this.remove(state)
      return
    }
    this.flush(state)
  }

  private fail(state: State, error: unknown) {
    if (state.terminal || state.final) return
    clearTimeout(state.writeTimer)
    for (const job of [state.active, ...state.jobs]) job?.reject(error)
    state.active = undefined
    state.jobs.length = 0
    state.writeBytes = 0
    // Flush already accepted business data before the one terminal error.
    this.finish(state, {
      ...this.event(state),
      type: 'error',
      error: serializeError(error, 'grpc', state.request.requestId, `grpc.${state.request.api}`),
    })
    state.stream?.cancel()
  }

  async command(owner: string, request: Request): Promise<void> {
    const state = this.current(owner, request)
    if (!state) {
      if (request.action === 'cancel' || request.action === 'ack') return
      throw new Error('Stream instance is no longer active')
    }
    if (request.action === 'cancel') {
      this.remove(state, new Error('Stream cancelled'))
      return
    }
    if (request.action === 'detach') {
      if (!state.factory.persistent) throw new Error('Only MITM sessions can be detached')
      this.detach(state)
      return
    }
    if (request.action === 'ack') {
      const batch = state.inflight.get(request.ack ?? -1)
      if (!batch) return
      state.inflight.delete(request.ack!)
      state.bytes -= batch.bytes
      state.count -= batch.count
      state.normalBytes -= batch.normalBytes
      state.normalCount -= batch.normalCount
      this.backpressure(state)
      this.flush(state)
      return
    }
    if (!state.factory.requestStream || state.ended || state.final) throw new Error('Stream is not writable')
    if (request.action !== 'write' && request.action !== 'end') throw new Error('Invalid stream command')
    const bytes = payloadBytes(request.params)
    if (
      state.jobs.length + Number(Boolean(state.active)) >= this.limits.maxPendingWrites ||
      state.writeBytes + bytes > this.limits.maxBytes
    )
      throw new Error('Stream write queue capacity exceeded')
    if (request.action === 'end') state.ended = true
    return new Promise<void>((resolve, reject) => {
      state.jobs.push({ action: request.action as 'write' | 'end', params: request.params, resolve, reject, bytes })
      state.writeBytes += bytes
      this.pump(state)
    })
  }

  private pump(state: State) {
    if (state.active || state.terminal) return
    const job = state.jobs.shift()
    if (!job) return
    state.active = job
    let done = false
    const complete = (error?: unknown) => {
      if (done) return
      done = true
      clearTimeout(state.writeTimer)
      if (state.terminal || state.active !== job) return
      state.active = undefined
      state.writeBytes -= job.bytes
      if (error) {
        job.reject(error)
        this.fail(state, error)
      } else {
        if (state.factory.persistent && job.action === 'write' && job.params && typeof job.params === 'object') {
          const saved = state.request.params && typeof state.request.params === 'object' ? state.request.params : {}
          const fields = ['host', 'port', 'downstreamProxy', 'Host', 'Port', 'DownstreamProxy', 'DownstreamProxyRuleId']
          state.request.params = {
            ...saved,
            ...Object.fromEntries(Object.entries(job.params).filter(([key]) => fields.includes(key))),
          }
        }
        job.resolve()
        this.pump(state)
      }
    }
    state.writeTimer = setTimeout(() => complete(new Error('Stream write timed out')), this.limits.writeTimeoutMs)
    try {
      if (job.action === 'end') {
        state.stream!.end!()
        complete()
      } else state.stream!.write!(job.params, complete)
    } catch (error) {
      complete(error)
    }
  }

  private remove(state: State, error?: unknown) {
    if (state.terminal) return
    state.terminal = true
    state.controller.abort()
    clearTimeout(state.timer)
    clearTimeout(state.writeTimer)
    if (this.states.get(this.key(state.owner, state.request.token)) === state)
      this.states.delete(this.key(state.owner, state.request.token))
    if (state.active?.action === 'end' && !error) state.active.resolve()
    else state.active?.reject(error ?? new Error('Stream ended'))
    for (const job of state.jobs) job.reject(error ?? new Error('Stream ended'))
    state.jobs.length = 0
    state.queue.length = 0
    state.inflight.clear()
    if (error) state.stream?.cancel()
  }

  cancelRequest(owner: string, requestId: string, api: string, namespace: Request['namespace']) {
    for (const state of this.states.values())
      if (
        state.owner === owner &&
        state.request.requestId === requestId &&
        state.request.api === api &&
        state.request.namespace === namespace
      )
        this.remove(state, new Error('Operation aborted'))
  }

  cancelOwner(owner: string, preserveMITM = false) {
    for (const state of this.states.values())
      if (state.owner === owner) {
        if (preserveMITM && state.factory.persistent && !state.final) this.detach(state)
        else this.remove(state, new Error('Renderer session closed'))
      }
  }

  private detach(state: State) {
    state.detached = true
    clearTimeout(state.timer)
    clearTimeout(state.writeTimer)
    state.flushScheduled = false
    const replay = [...state.inflight.values()].flatMap((batch) =>
      batch.items.map((data) => ({
        data,
        bytes: payloadBytes(data),
        control: state.factory.isControl?.(data) ?? true,
      })),
    )
    state.queue.unshift(...replay)
    state.inflight.clear()
    const error = new Error('MITM renderer detached')
    for (const job of [state.active, ...state.jobs]) job?.reject(error)
    state.active = undefined
    state.jobs.length = 0
    state.writeBytes = 0
  }

  cancelGroup(group: string) {
    for (const state of this.states.values()) if (state.group === group) this.remove(state, new Error('Window closed'))
  }

  persistentParams(owner: string, api: string): unknown {
    const group = this.ownerGroup(owner)
    return [...this.states.values()].find(
      (state) => state.group === group && state.factory.persistent && !state.final && state.request.api === api,
    )?.request.params
  }

  withStream<T>(
    owner: string,
    identity: Pick<Request, 'api' | 'namespace' | 'token' | 'instanceId'>,
    use: (stream: GrpcStream) => T,
  ): T {
    const state = this.current(owner, { ...identity, action: 'write', requestId: '' })
    if (!state?.stream || state.terminal || state.final) throw new Error('Stream instance is no longer active')
    return use(state.stream)
  }

  cancelAll() {
    for (const state of this.states.values()) {
      const error = Object.assign(new Error('Engine connection changed'), { code: 'UNAVAILABLE' })
      this.remove(state, error)
      this.emit(state.owner, {
        ...this.event(state),
        type: 'error',
        error: serializeError(error, 'grpc', state.request.requestId, `grpc.${state.request.api}`),
      })
    }
  }

  get size() {
    return this.states.size
  }
}

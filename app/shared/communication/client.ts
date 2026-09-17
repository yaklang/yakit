import { BridgeError, serializeError, unwrap } from './errors'
import type {
  BridgeEvent,
  CallOptions,
  LocalCallOptions,
  ProgressOf,
  StreamEvent,
  GrpcApi,
  GrpcApiOfKind,
  GrpcInput,
  GrpcOutput,
  Namespace,
  Request,
  StreamOptions,
  Transport,
} from './protocol'

interface InternalStreamTask<Input, Output> {
  readonly token: string
  readonly instanceId: string
  readonly result: Promise<Output>
  write(params: Input): Promise<void>
  end(): Promise<void>
  cancel(): Promise<void>
  detach(): Promise<void>
}

type StreamingApi = GrpcApiOfKind<'duplex' | 'serverStream' | 'clientStream'>
export type StreamTask<A extends StreamingApi> = Pick<
  InternalStreamTask<GrpcInput<A>, GrpcOutput<A>>,
  'token' | 'instanceId' | 'cancel'
> &
  (A extends GrpcApiOfKind<'duplex' | 'clientStream'>
    ? Pick<InternalStreamTask<GrpcInput<A>, GrpcOutput<A>>, 'write' | 'end'>
    : {}) &
  (A extends GrpcApiOfKind<'clientStream'> ? { readonly result: Promise<GrpcOutput<A>> } : {}) &
  (A extends 'MITM' | 'MITMV2' ? { detach(): Promise<void> } : {})

type LocalMethod = { request: unknown; response: unknown }
type Session = {
  api: string
  instanceId: string
  receive(event: StreamEvent): void
  cancel(): Promise<void>
  detach(): Promise<void>
}

/** One transport subscription per renderer, with direct token/instance routing. */
export function createClient<Local extends { [K in keyof Local]: LocalMethod }>(transport: Transport) {
  const sessions = new Map<string, Session>()
  const events = new Map<string, Set<(...args: unknown[]) => void>>()
  const pending = new Map<string, () => void>()
  const progress = new Map<string, { api: string; callback: (data: unknown) => void }>()
  let disposed = false
  const uuid = () => globalThis.crypto.randomUUID()
  const errorFor = (message: string, code: string, request: Request) =>
    new BridgeError({
      name: code === 'ABORTED' ? 'AbortError' : 'BridgeError',
      message,
      code,
      source: 'ipc',
      requestId: request.requestId,
      method: `${request.namespace}.${request.api}`,
    })
  const report = (error: unknown) => console.error('IPC callback failed', error)
  const unsubscribe = transport.subscribe((event) => {
    if (event.type === 'app') {
      for (const callback of [...(events.get(event.name) || [])]) {
        try {
          callback(...event.args)
        } catch (error) {
          report(error)
        }
      }
      return
    }
    if (event.type === 'progress') {
      const current = progress.get(event.requestId)
      if (current?.api === event.api) {
        try {
          void Promise.resolve(current.callback(event.data)).catch(report)
        } catch (error) {
          report(error)
        }
      }
      return
    }
    const session = sessions.get(event.token)
    if (session?.instanceId === event.instanceId && session.api === event.api && event.namespace === 'grpc') {
      session.receive(event)
    }
  })

  async function raw(request: Request) {
    let reply
    try {
      reply = await transport.request(request)
    } catch (error) {
      throw error instanceof BridgeError
        ? error
        : BridgeError.fromData(serializeError(error, 'ipc', request.requestId, `${request.namespace}.${request.api}`))
    }
    // Keep business and gRPC errors outside the transport catch.
    return unwrap(reply)
  }

  async function request(request: Request, options: CallOptions = {}, onProgress?: (data: unknown) => void) {
    if (disposed) throw errorFor('IPC client disposed', 'DISPOSED', request)
    if (options.signal?.aborted) throw errorFor('Operation aborted', 'ABORTED', request)
    if (
      options.timeoutMs !== undefined &&
      (!Number.isFinite(options.timeoutMs) || options.timeoutMs <= 0 || options.timeoutMs > 2 ** 31 - 1)
    ) {
      throw errorFor('Invalid timeoutMs', 'INVALID_ARGUMENT', request)
    }
    let timer: ReturnType<typeof setTimeout> | undefined
    let abort: () => void = () => {}
    const interrupted = new Promise<never>((_resolve, reject) => {
      const stop = (code: string, message: string) => {
        progress.delete(request.requestId)
        reject(errorFor(message, code, request))
        void raw({
          ...request,
          requestId: uuid(),
          action: 'abort',
          params: undefined,
          targetRequestId: request.requestId,
        }).catch(report)
      }
      abort = () => stop('ABORTED', 'Operation aborted')
      pending.set(request.requestId, abort)
      options.signal?.addEventListener('abort', abort, { once: true })
      if (options.timeoutMs !== undefined)
        timer = setTimeout(() => stop('DEADLINE_EXCEEDED', 'Operation timed out'), options.timeoutMs)
    })
    if (onProgress) progress.set(request.requestId, { api: request.api, callback: onProgress })
    try {
      return await Promise.race([raw({ ...request, timeoutMs: options.timeoutMs }), interrupted])
    } finally {
      clearTimeout(timer)
      options.signal?.removeEventListener('abort', abort)
      pending.delete(request.requestId)
      progress.delete(request.requestId)
    }
  }

  function invoke<A extends GrpcApiOfKind<'unary'>>(
    namespace: 'grpc',
    api: A,
    params: GrpcInput<A>,
    options?: CallOptions,
  ): Promise<GrpcOutput<A>>
  function invoke<A extends keyof Local & string>(
    namespace: 'local',
    api: A,
    params: Local[A]['request'],
    options?: LocalCallOptions<ProgressOf<Local[A]>>,
  ): Promise<Local[A]['response']>
  function invoke<Progress>(
    namespace: Namespace,
    api: string,
    params: unknown,
    options?: LocalCallOptions<Progress>,
  ): Promise<unknown> {
    return request(
      { namespace, api, params, requestId: uuid(), action: 'call' },
      options,
      options?.onProgress ? (data) => options.onProgress?.(data as Progress) : undefined,
    )
  }

  function openStream<A extends StreamingApi>(
    namespace: 'grpc',
    api: A,
    params: GrpcInput<A>,
    options?: StreamOptions<GrpcOutput<A>>,
  ): Promise<StreamTask<A>>
  async function openStream<A extends StreamingApi>(
    namespace: 'grpc',
    api: A,
    params: GrpcInput<A>,
    options: StreamOptions<GrpcOutput<A>> = {},
  ): Promise<InternalStreamTask<GrpcInput<A>, GrpcOutput<A>>> {
    const token = options.token ?? uuid()
    const base = { namespace, api, token, instanceId: uuid() }
    if (sessions.has(token))
      throw errorFor('Token already has a live stream', 'ALREADY_EXISTS', {
        ...base,
        requestId: uuid(),
        action: 'open',
      })
    let terminal = false
    let opening = true
    let openingError: BridgeError | undefined
    let sequence = 0
    let delivery = Promise.resolve()
    let resolveResult!: (data: GrpcOutput<A>) => void
    let rejectResult!: (error: unknown) => void
    const result = new Promise<GrpcOutput<A>>((resolve, reject) => {
      resolveResult = resolve
      rejectResult = reject
    })
    // Readable streams can use only callbacks; an unused result must not cause unhandled rejection.
    void result.catch(() => {})
    const cleanup = () => {
      terminal = true
      if (sessions.get(token)?.instanceId === base.instanceId) sessions.delete(token)
      options.signal?.removeEventListener('abort', abort)
    }
    const notifyError = (error: BridgeError) => {
      try {
        options.onError?.(error)
      } catch (callbackError) {
        report(callbackError)
      }
    }
    const command = (action: Request['action'], params?: unknown) => raw({ ...base, action, params, requestId: uuid() })
    const task: InternalStreamTask<GrpcInput<A>, GrpcOutput<A>> = {
      token,
      instanceId: base.instanceId,
      result,
      async write(params) {
        if (terminal)
          throw errorFor('Stream has ended', 'STREAM_CLOSED', { ...base, action: 'write', requestId: uuid() })
        await command('write', params)
      },
      async end() {
        if (!terminal) await command('end')
      },
      async cancel() {
        if (terminal) return
        cleanup()
        rejectResult(errorFor('Stream cancelled', 'ABORTED', { ...base, action: 'cancel', requestId: uuid() }))
        await command('cancel')
      },
      async detach() {
        if (terminal) return
        if (api !== 'MITM' && api !== 'MITMV2') throw new Error('Only MITM sessions can be detached')
        cleanup()
        rejectResult(errorFor('MITM session detached', 'ABORTED', { ...base, action: 'detach', requestId: uuid() }))
        await command('detach')
      },
    }
    const abort = () => {
      void task.cancel().catch(report)
    }
    sessions.set(token, {
      api,
      instanceId: base.instanceId,
      cancel: task.cancel,
      detach: task.detach,
      receive(event) {
        delivery = delivery.then(() => receive(event)).catch(report)
      },
    })
    async function receive(event: Exclude<BridgeEvent, { type: 'app' }>) {
      if (terminal) return
      if (event.type === 'data') {
        if (event.sequence !== sequence + 1) {
          notifyError(
            errorFor('Invalid stream event sequence', 'DATA_LOSS', { ...base, action: 'ack', requestId: uuid() }),
          )
          void task.cancel().catch(report)
          return
        }
        sequence = event.sequence
        try {
          for (const item of event.items) {
            if (terminal) break
            await options.onData?.(item as GrpcOutput<A>)
          }
        } catch (error) {
          notifyError(BridgeError.fromData(serializeError(error, 'local', '', `${namespace}.${api}`)))
          void task.cancel().catch(report)
        } finally {
          void raw({ ...base, requestId: uuid(), action: 'ack', ack: sequence }).catch(report)
        }
      } else if (event.type === 'error') {
        cleanup()
        const error = BridgeError.fromData(event.error)
        rejectResult(error)
        if (opening) openingError = error
        else notifyError(error)
      } else if (event.type === 'result') {
        cleanup()
        resolveResult(event.data as GrpcOutput<A>)
      } else {
        cleanup()
        // Only client streams have a final response. Readable stream completion is onEnd.
        rejectResult(
          errorFor('Readable stream has no unary result', 'NO_RESULT', { ...base, requestId: uuid(), action: 'end' }),
        )
        try {
          options.onEnd?.()
        } catch (error) {
          report(error)
        }
      }
    }
    // Register before open so synchronous first data/error cannot be lost.
    try {
      await request({ ...base, requestId: uuid(), action: 'open', params, resume: options.resume }, options)
      opening = false
      if (openingError) notifyError(openingError)
      if (!terminal) {
        options.signal?.addEventListener('abort', abort, { once: true })
        if (options.signal?.aborted) abort()
      }
      return task
    } catch (error) {
      opening = false
      cleanup()
      rejectResult(error)
      void command('cancel').catch(report)
      throw error
    }
  }

  return {
    invoke,
    openStream,
    on<Args extends unknown[]>(name: string, callback: (...args: Args) => void) {
      if (disposed) throw new Error('IPC client disposed')
      const subscribers = events.get(name) ?? new Set()
      const listener = (...args: unknown[]) => callback(...(args as Args))
      subscribers.add(listener)
      events.set(name, subscribers)
      return () => {
        subscribers.delete(listener)
        if (!subscribers.size) events.delete(name)
      }
    },
    dispose(options?: { preserveMITM?: boolean }) {
      if (disposed) return
      disposed = true
      for (const abort of pending.values()) abort()
      for (const session of [...sessions.values()]) {
        const detach = options?.preserveMITM && (session.api === 'MITM' || session.api === 'MITMV2')
        void (detach ? session.detach() : session.cancel()).catch(report)
      }
      events.clear()
      unsubscribe()
    },
  }
}

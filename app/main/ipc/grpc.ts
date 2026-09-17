import type { ClientUnaryCall, ServiceError } from '@grpc/grpc-js'
import type { GrpcApi, GrpcApiOfKind, GrpcInput, GrpcOutput } from '../../shared/communication/protocol'
import { grpcMethods } from '../../shared/generated/grpc/methods'
import type { GrpcStream, StreamFactory } from './streams'
import type { YakClient } from '../../shared/generated/grpc/types'

export type GrpcClient = YakClient
type DynamicMethod = (...args: unknown[]) => ClientUnaryCall | GrpcStream

/** 主进程业务适配器使用相同的生成契约，并把取消传到真正的 gRPC 调用。 */
export function callGrpc<A extends GrpcApiOfKind<'unary'>>(
  getClient: () => GrpcClient,
  api: A,
  params: GrpcInput<A>,
  signal: AbortSignal,
  timeoutMs?: number,
): Promise<GrpcOutput<A>> {
  return new Promise((resolve, reject) => {
    let settled = false
    let call: ClientUnaryCall | undefined
    const finish = (error: unknown, data?: unknown) => {
      if (settled) return
      settled = true
      signal.removeEventListener('abort', cancel)
      if (error) reject(error)
      else resolve(data as GrpcOutput<A>)
    }
    const cancel = () => {
      call?.cancel()
      finish(Object.assign(new Error('Operation aborted'), { code: 'ABORTED' }))
    }
    if (signal.aborted) {
      cancel()
      return
    }
    call = createGrpcMethods(getClient).unary(api, params, finish, timeoutMs)
    if (!settled) {
      signal.addEventListener('abort', cancel, { once: true })
      if (signal.aborted) cancel()
    }
  })
}

export function createGrpcMethods(getClient: () => GrpcClient) {
  return {
    unary(
      api: GrpcApi,
      params: unknown,
      callback: (error: ServiceError | null, data: unknown) => void,
      timeoutMs?: number,
    ) {
      const method = grpcMethods[api]
      if (method.requestStream || method.responseStream) throw new Error('Use openStream for streaming methods')
      const client = getClient()
      // The allowlist and generated cardinality have already selected a real method.
      return (client[api] as unknown as DynamicMethod).call(
        client,
        params ?? {},
        ...(timeoutMs === undefined ? [] : [{ deadline: Date.now() + timeoutMs }]),
        callback,
      ) as ClientUnaryCall
    },
    stream(api: GrpcApi): StreamFactory {
      const method = grpcMethods[api]
      if (!method.requestStream && !method.responseStream) throw new Error('Use invoke for unary methods')
      return {
        ...method,
        pauseable: !method.requestStream,
        create(params, callback) {
          const client = getClient()
          const call = (client[api] as unknown as DynamicMethod).bind(client)
          return (
            method.requestStream ? (method.responseStream ? call() : call(callback)) : call(params ?? {})
          ) as GrpcStream
        },
      }
    },
  }
}

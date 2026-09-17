import type { GrpcMethods } from '../generated/grpc/types'
import type { BridgeError } from './errors'
import type { Long } from '@grpc/proto-loader'

export const REQUEST_CHANNEL = 'yakit:request'
export const EVENT_CHANNEL = 'yakit:event'
export type Namespace = 'grpc' | 'local'
export type ErrorSource = Namespace | 'ipc'
export interface ErrorData {
  name: string
  message: string
  source: ErrorSource
  code?: number | string
  details?: string
  originalMessage?: string
  requestId: string
  method: string
}
export type Reply<T = unknown> = { ok: true; data: T } | { ok: false; error: ErrorData }
export interface Request {
  requestId: string
  namespace: Namespace
  api: string
  action: 'call' | 'open' | 'write' | 'end' | 'cancel' | 'ack' | 'abort' | 'detach'
  params?: unknown
  token?: string
  instanceId?: string
  targetRequestId?: string
  timeoutMs?: number
  ack?: number
  resume?: boolean
}
export type StreamEvent = {
  namespace: Namespace
  api: string
  token: string
  instanceId: string
} & (
  | { type: 'data'; sequence: number; items: unknown[] }
  | { type: 'error'; error: ErrorData }
  | { type: 'end' }
  | { type: 'result'; data: unknown }
)
export type BridgeEvent =
  | StreamEvent
  | { type: 'app'; name: string; args: unknown[] }
  | { type: 'progress'; namespace: 'local'; api: string; requestId: string; data: unknown }
// Only cloneable values cross preload's contextBridge. Errors are reconstructed by the renderer SDK.
export interface Transport {
  request(request: Request): Promise<Reply>
  subscribe(listener: (event: BridgeEvent) => void): () => void
}
// Buffer becomes Uint8Array. Long instances contain methods and must be represented
// as decimal strings across IPC; generated main-process inputs still accept Long.
export type Wire<T> = T extends Long
  ? string
  : T extends Uint8Array
    ? Uint8Array
    : T extends readonly (infer U)[]
      ? Wire<U>[]
      : T extends object
        ? { [K in keyof T]: Wire<T[K]> }
        : T
export type GrpcApi = keyof GrpcMethods
export type GrpcApiOfKind<K extends GrpcMethods[GrpcApi]['kind']> = {
  [A in GrpcApi]: GrpcMethods[A]['kind'] extends K ? A : never
}[GrpcApi]
export type GrpcInput<A extends GrpcApi> = Wire<GrpcMethods[A]['request']>
export type GrpcOutput<A extends GrpcApi> = Wire<GrpcMethods[A]['response']>
export interface CallOptions {
  signal?: AbortSignal
  timeoutMs?: number
}
export type ProgressOf<Method> = Method extends { progress: infer Progress } ? Progress : never
export interface LocalCallOptions<Progress> extends CallOptions {
  onProgress?: (data: Progress) => void
}
export interface StreamOptions<T> extends CallOptions {
  /** 仅用于已存在的 MITM 会话；主进程验证窗口归属后重新绑定。 */
  resume?: boolean
  token?: string
  onData?: (data: T) => void | Promise<void>
  onError?: (error: BridgeError) => void
  onEnd?: () => void
}

import type { ErrorData, ErrorSource, Reply } from './protocol'

export class BridgeError extends Error implements ErrorData {
  readonly source: ErrorSource
  readonly code?: string | number
  readonly details?: string
  readonly originalMessage?: string
  readonly requestId: string
  readonly method: string

  constructor(data: ErrorData) {
    super(data.message)
    this.name = data.name
    this.source = data.source
    this.code = data.code
    this.details = data.details
    this.originalMessage = data.originalMessage
    this.requestId = data.requestId
    this.method = data.method
  }

  static fromData(data: ErrorData): BridgeError {
    return new BridgeError(data)
  }
}

export function serializeError(error: unknown, source: ErrorSource, requestId: string, method: string): ErrorData {
  if (error instanceof BridgeError)
    return {
      name: error.name,
      message: error.message,
      source: error.source,
      code: error.code,
      details: error.details,
      originalMessage: error.originalMessage,
      requestId: error.requestId,
      method: error.method,
    }
  const record = typeof error === 'object' && error !== null ? (error as Record<string, unknown>) : {}
  const originalMessage = typeof record.message === 'string' ? record.message : String(error)
  const details = typeof record.details === 'string' ? record.details : undefined
  return {
    name: typeof record.name === 'string' ? record.name : 'Error',
    message: source === 'grpc' && details ? details : originalMessage,
    source,
    code: typeof record.code === 'string' || typeof record.code === 'number' ? record.code : undefined,
    details,
    originalMessage,
    requestId,
    method,
  }
}

export function unwrap<T>(reply: Reply<T>): T {
  if (reply.ok === false) throw BridgeError.fromData(reply.error)
  return reply.data
}

import { registerMainMethod } from '../ipc/index'
import type {
  YakClient,
  StartIMControlRequest,
  StartIMControlResponse__Output,
} from '../../shared/generated/grpc/types'

function parseRequest(value: unknown): StartIMControlRequest {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid IM control request')
  const request = value as Record<string, unknown>
  // protobuf validates the remaining fields; EngineAddr is consumed by this business adapter.
  if (request.EngineAddr !== undefined && typeof request.EngineAddr !== 'string')
    throw new Error('Invalid engine address')
  return request
}

export function registerIMControl(getClient: () => YakClient, getEngineAddr: () => string) {
  registerMainMethod('StartIMControl', (params, context) => {
    const request = parseRequest(params)
    return new Promise<StartIMControlResponse__Output>((resolve, reject) => {
      const call = getClient().StartIMControl(
        { ...request, EngineAddr: request.EngineAddr || getEngineAddr() },
        (error, data) => {
          context.signal.removeEventListener('abort', cancel)
          if (error) reject(error)
          else if (data) resolve(data)
          else reject(new Error('StartIMControl returned no response'))
        },
      )
      const cancel = () => call.cancel()
      context.signal.addEventListener('abort', cancel, { once: true })
      if (context.signal.aborted) cancel()
    })
  })
}

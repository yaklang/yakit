import { int64String } from '@/utils/int64'
import { fetchHTTPFlow as requestHTTPFlow } from '@/components/HTTPFlowTable/HTTPFlowTable.grpc'
import type { HTTPFlow } from './HTTPFlowTable.constants'

export type HTTPFlowByIdFetcher = (id: string | number) => Promise<HTTPFlow>

const requestHydrationInFlight = new Map<string, Promise<HTTPFlow>>()

const defaultHTTPFlowByIdFetcher: HTTPFlowByIdFetcher = async (id) => {
  return await requestHTTPFlow({ Id: id })
}

export const hasHTTPFlowRequestPacket = (flow: HTTPFlow): boolean => !!flow?.Request?.length

export const hydrateHTTPFlowRequest = async (
  flow: HTTPFlow,
  fetchById: HTTPFlowByIdFetcher = defaultHTTPFlowByIdFetcher,
): Promise<HTTPFlow> => {
  if (hasHTTPFlowRequestPacket(flow)) return flow
  const id = int64String(flow?.Id)
  if (BigInt(id) <= BigInt(0)) {
    throw new Error('cannot load an HTTP flow without a valid id')
  }

  const existing = requestHydrationInFlight.get(id)
  if (existing) return await existing

  const pending = Promise.resolve(fetchById(flow.Id))
    .then((detail) => {
      if (!detail || int64String(detail.Id) !== id) {
        throw new Error(`loaded HTTP flow id does not match ${id}`)
      }
      if (!hasHTTPFlowRequestPacket(detail)) {
        throw new Error(`HTTP flow ${id} has no request packet`)
      }
      return { ...flow, ...detail }
    })
    .finally(() => {
      if (requestHydrationInFlight.get(id) === pending) {
        requestHydrationInFlight.delete(id)
      }
    })

  requestHydrationInFlight.set(id, pending)
  return await pending
}

export const hydrateHTTPFlowRequests = async (
  flows: HTTPFlow[],
  fetchById: HTTPFlowByIdFetcher = defaultHTTPFlowByIdFetcher,
): Promise<HTTPFlow[]> => await Promise.all(flows.map((flow) => hydrateHTTPFlowRequest(flow, fetchById)))

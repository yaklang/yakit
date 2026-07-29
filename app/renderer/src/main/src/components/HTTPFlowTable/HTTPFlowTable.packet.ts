import type { HTTPFlow } from './HTTPFlowTable.constants'

export type HTTPFlowByIdFetcher = (id: number) => Promise<HTTPFlow>

const requestHydrationInFlight = new Map<number, Promise<HTTPFlow>>()

const defaultHTTPFlowByIdFetcher: HTTPFlowByIdFetcher = async (id) => {
  const { ipcRenderer } = window.require('electron')
  return await ipcRenderer.invoke('GetHTTPFlowById', { Id: id })
}

export const hasHTTPFlowRequestPacket = (flow: HTTPFlow): boolean => !!flow?.Request?.length

export const hydrateHTTPFlowRequest = async (
  flow: HTTPFlow,
  fetchById: HTTPFlowByIdFetcher = defaultHTTPFlowByIdFetcher,
): Promise<HTTPFlow> => {
  if (hasHTTPFlowRequestPacket(flow)) return flow
  if (!Number.isSafeInteger(+flow?.Id) || +flow.Id <= 0) {
    throw new Error('cannot load an HTTP flow without a valid id')
  }

  const id = +flow.Id
  const existing = requestHydrationInFlight.get(id)
  if (existing) return await existing

  const pending = Promise.resolve(fetchById(id))
    .then((detail) => {
      if (!detail || +detail.Id !== id) {
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

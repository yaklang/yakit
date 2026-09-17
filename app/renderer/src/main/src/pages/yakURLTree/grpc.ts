import { ipc, type GrpcInput } from '@/services/ipc'
import { int64ToSafeNumber } from '@/utils/int64'
import type { RequestYakURLResponse } from './data'

export async function requestYakURL(
  params: GrpcInput<'RequestYakURL'>,
  options?: { signal?: AbortSignal },
): Promise<RequestYakURLResponse> {
  const result = await ipc.invoke('grpc', 'RequestYakURL', params, options)
  return {
    Page: int64ToSafeNumber(result.Page),
    PageSize: int64ToSafeNumber(result.PageSize),
    Total: int64ToSafeNumber(result.Total),
    Resources: result.Resources.map((resource) => ({
      ...resource,
      Size: int64ToSafeNumber(resource.Size),
      ModifiedTimestamp: int64ToSafeNumber(resource.ModifiedTimestamp),
    })),
  }
}

import { ipc, type GrpcInput, type GrpcOutput } from '@/services/ipc'
import { grpcPagingToUI, int64ToSafeNumber } from '@/utils/int64'
import type { HTTPFlow, YakQueryHTTPFlowResponse } from './HTTPFlowTable.constants'
import { useEffect, useRef } from 'react'
import { useMemoizedFn } from 'ahooks'

export function useExportRuleData() {
  const controllerRef = useRef<AbortController>()
  useEffect(() => () => controllerRef.current?.abort(), [])
  return useMemoizedFn((params: GrpcInput<'ExportMITMRuleExtractedData'>) => {
    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller
    return new Promise<string>((resolve, reject) => {
      let path = ''
      let done = false
      const finish = (error?: unknown) => {
        if (done) return
        done = true
        controller.signal.removeEventListener('abort', aborted)
        if (controllerRef.current === controller) controllerRef.current = undefined
        if (error) reject(error)
        else if (!path) reject(new Error('Export completed without a file path'))
        else resolve(path)
      }
      const aborted = () => finish(Object.assign(new Error('Export cancelled'), { name: 'AbortError' }))
      controller.signal.addEventListener('abort', aborted, { once: true })
      void ipc
        .openStream('grpc', 'ExportMITMRuleExtractedData', params, {
          signal: controller.signal,
          onData(data) {
            if (data.ExportFilePath) path = data.ExportFilePath
          },
          onError: finish,
          onEnd: () => finish(),
        })
        .catch(finish)
    })
  })
}

export async function queryHTTPFlows(params: GrpcInput<'QueryHTTPFlows'>, options?: { signal?: AbortSignal }) {
  const value = params.IncludeSystemTiming
    ? await ipc.invoke('local', 'QueryHTTPFlowsWithTiming', params, options)
    : await ipc.invoke('grpc', 'QueryHTTPFlows', params, options)
  return httpFlowsForUI(value)
}

export async function fetchHTTPFlow(params: GrpcInput<'GetHTTPFlowById'>, options?: { signal?: AbortSignal }) {
  const value = await ipc.invoke('grpc', 'GetHTTPFlowById', params, options)
  return {
    ...httpFlowForUI(value),
    RequestString: Buffer.from(value.Request).toString('utf8'),
    ResponseString: Buffer.from(value.Response).toString('utf8'),
  }
}

/** List rows retain packet bytes; decoding is deferred until a detail or export needs text. */
export function httpFlowForUI(value: GrpcOutput<'GetHTTPFlowById'>): HTTPFlow {
  return {
    ...value,
    BodyLength: int64ToSafeNumber(value.BodyLength),
    StatusCode: int64ToSafeNumber(value.StatusCode),
    GetParamsTotal: int64ToSafeNumber(value.GetParamsTotal),
    PostParamsTotal: int64ToSafeNumber(value.PostParamsTotal),
    CookieParamsTotal: int64ToSafeNumber(value.CookieParamsTotal),
    RequestLength: int64ToSafeNumber(value.RequestLength),
    CreatedAt: int64ToSafeNumber(value.CreatedAt),
    UpdatedAt: int64ToSafeNumber(value.UpdatedAt),
    DurationMs: int64ToSafeNumber(value.DurationMs),
    MultipartFiles: value.MultipartFiles.map((part) => ({ ...part, Size: int64ToSafeNumber(part.Size) })),
  }
}

export function httpFlowsForUI(value: GrpcOutput<'QueryHTTPFlows'>): YakQueryHTTPFlowResponse {
  return {
    ...value,
    Data: value.Data.map(httpFlowForUI),
    Pagination: grpcPagingToUI(value.Pagination),
    Total: int64ToSafeNumber(value.Total),
    SystemTiming: value.SystemTiming ?? undefined,
  }
}

export function extractedDataForUI(value: GrpcOutput<'QueryMITMRuleExtractedData'>) {
  return {
    ...value,
    Data: value.Data.map((row) => ({
      ...row,
      CreatedAt: int64ToSafeNumber(row.CreatedAt),
      Index: int64ToSafeNumber(row.Index),
      Length: int64ToSafeNumber(row.Length),
    })),
    Pagination: grpcPagingToUI(value.Pagination),
    Total: int64ToSafeNumber(value.Total),
  }
}

import type { GrpcOutput } from '@/services/ipc'
import { int64ToSafeNumber } from '@/utils/int64'
import type { FuzzerResponse } from './HTTPFuzzerPage'

export function fuzzerHistoryForUI(value: GrpcOutput<'GetHistoryHTTPFuzzerTask'>) {
  if (!value.BasicInfo || !value.OriginRequest) throw new Error('Fuzzer 历史缺少请求或任务信息')
  return {
    ...value,
    BasicInfo: { ...value.BasicInfo, CreatedAt: int64ToSafeNumber(value.BasicInfo.CreatedAt) },
    OriginRequest: value.OriginRequest,
  }
}

export function fuzzerHistoriesForUI(value: GrpcOutput<'QueryHistoryHTTPFuzzerTaskEx'>) {
  return { ...value, Data: value.Data.map(fuzzerHistoryForUI) }
}

export function fuzzerResponseForUI(value: GrpcOutput<'RedirectRequest'>): FuzzerResponse {
  return {
    ...value,
    BodyLength: int64ToSafeNumber(value.BodyLength),
    DurationMs: int64ToSafeNumber(value.DurationMs),
    Timestamp: int64ToSafeNumber(value.Timestamp),
    DNSDurationMs: int64ToSafeNumber(value.DNSDurationMs),
    FirstByteDurationMs: int64ToSafeNumber(value.FirstByteDurationMs),
    TotalDurationMs: int64ToSafeNumber(value.TotalDurationMs),
    TLSHandshakeDurationMs: int64ToSafeNumber(value.TLSHandshakeDurationMs),
    TCPDurationMs: int64ToSafeNumber(value.TCPDurationMs),
    ConnectDurationMs: int64ToSafeNumber(value.ConnectDurationMs),
    RandomChunkedData: value.RandomChunkedData.map((row) => ({
      ...row,
      Index: int64ToSafeNumber(row.Index),
      ChunkedLength: int64ToSafeNumber(row.ChunkedLength),
      CurrentChunkedDelayTime: int64ToSafeNumber(row.CurrentChunkedDelayTime),
      TotalDelayTime: int64ToSafeNumber(row.TotalDelayTime),
      Direction:
        row.Direction === 'CHUNKED_DATA_DIRECTION_REQUEST'
          ? 1
          : row.Direction === 'CHUNKED_DATA_DIRECTION_RESPONSE'
            ? 2
            : 0,
    })),
  }
}

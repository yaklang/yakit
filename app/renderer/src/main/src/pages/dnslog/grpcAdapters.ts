import type { GrpcOutput } from '@/services/ipc'
import { int64ToSafeNumber } from '@/utils/int64'

export function dnsLogsForUI(value: GrpcOutput<'QueryDNSLogByToken'>) {
  return { ...value, Events: value.Events.map((row) => ({ ...row, Timestamp: int64ToSafeNumber(row.Timestamp) })) }
}

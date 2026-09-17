import type { GrpcOutput } from '@/services/ipc'
import { int64ToSafeNumber } from '@/utils/int64'
export interface PortAsset {
  CPE: string[]
  Host: string
  IPInteger?: number
  Port: number
  Proto: string
  ServiceType: string
  State: string
  Reason: string
  Fingerprint: string
  HtmlTitle: string
  Id: string | number
  CreatedAt: number
  UpdatedAt: number
}

export interface Report {
  Title: string
  Id: string | number
  Hash: string
  Owner: string
  From: string
  PublishedAt: number
  JsonRaw: string
}

export function portsForUI(value: GrpcOutput<'QueryPorts'>) {
  return {
    ...value,
    Data: value.Data.map((row) => ({
      ...row,
      IPInteger: int64ToSafeNumber(row.IPInteger),
      Port: int64ToSafeNumber(row.Port),
      CreatedAt: int64ToSafeNumber(row.CreatedAt),
      UpdatedAt: int64ToSafeNumber(row.UpdatedAt),
    })),
  }
}
export function reportForUI(value: GrpcOutput<'QueryReport'>): Report {
  return { ...value, PublishedAt: int64ToSafeNumber(value.PublishedAt) }
}
export function reportsForUI(value: GrpcOutput<'QueryReports'>) {
  return { ...value, Data: value.Data.map(reportForUI) }
}

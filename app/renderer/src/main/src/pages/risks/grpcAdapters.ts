import type { GrpcOutput } from '@/services/ipc'
import { grpcPagingToUI, int64ToSafeNumber } from '@/utils/int64'
import type { Risk } from './schema'
import type { SSARisk } from '../yakRunnerAuditHole/YakitAuditHoleTable/YakitAuditHoleTableType'

export function riskForUI(value: GrpcOutput<'QueryRisks'>['Data'][number]): Risk {
  return {
    ...value,
    Port: String(value.Port),
    CreatedAt: int64ToSafeNumber(value.CreatedAt),
    UpdatedAt: int64ToSafeNumber(value.UpdatedAt),
  }
}

export function risksForUI(value: GrpcOutput<'QueryRisks'>) {
  return {
    ...value,
    Data: value.Data.map(riskForUI),
    Pagination: grpcPagingToUI(value.Pagination),
    Total: int64ToSafeNumber(value.Total),
  }
}

export function ssaRiskForUI(value: GrpcOutput<'QuerySSARisks'>['Data'][number]): SSARisk {
  return {
    ...value,
    CreatedAt: int64ToSafeNumber(value.CreatedAt),
    UpdatedAt: int64ToSafeNumber(value.UpdatedAt),
    Index: int64ToSafeNumber(value.Index),
    Line: int64ToSafeNumber(value.Line),
  }
}

export function ssaRisksForUI(value: GrpcOutput<'QuerySSARisks'>) {
  return {
    ...value,
    Data: value.Data.map(ssaRiskForUI),
    Pagination: grpcPagingToUI(value.Pagination),
    Total: int64ToSafeNumber(value.Total),
  }
}

export function newSSARisksForUI(value: GrpcOutput<'QueryNewSSARisks'>) {
  return {
    ...value,
    Data: value.Data.map(ssaRiskForUI),
    NewRiskTotal: int64ToSafeNumber(value.NewRiskTotal),
    Total: int64ToSafeNumber(value.Total),
    Unread: int64ToSafeNumber(value.Unread),
  }
}

export function newRisksForUI(value: GrpcOutput<'QueryNewRisk'>) {
  return {
    ...value,
    Data: value.Data.map((risk) => ({
      ...risk,
      CreatedAt: int64ToSafeNumber(risk.CreatedAt),
      UpdatedAt: int64ToSafeNumber(risk.UpdatedAt),
    })),
    NewRiskTotal: int64ToSafeNumber(value.NewRiskTotal),
    Total: int64ToSafeNumber(value.Total),
    Unread: int64ToSafeNumber(value.Unread),
  }
}

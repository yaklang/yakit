import type { GrpcOutput } from '@/services/ipc'
import { int64ToSafeNumber } from '@/utils/int64'
import type { GetSSAWorkbenchDashboardResponse } from './IRifyHomeType'

export function workbenchForUI(value: GrpcOutput<'GetSSAWorkbenchDashboard'>): GetSSAWorkbenchDashboardResponse {
  return {
    ...value,
    Summary: {
      ProjectCount: int64ToSafeNumber(value.Summary?.ProjectCount ?? '0'),
      RuleCount: int64ToSafeNumber(value.Summary?.RuleCount ?? '0'),
      AIAuditTaskCount: int64ToSafeNumber(value.Summary?.AIAuditTaskCount ?? '0'),
    },
    TotalRiskCount: int64ToSafeNumber(value.TotalRiskCount),
    RiskOverview: value.RiskOverview.map((row) => ({ ...row, Count: int64ToSafeNumber(row.Count) })),
    RiskDistribution: value.RiskDistribution.map((row) => ({ ...row, Count: int64ToSafeNumber(row.Count) })),
    TopRuleHits: value.TopRuleHits.map((row) => ({ ...row, HitCount: int64ToSafeNumber(row.HitCount) })),
    RecentProjects: value.RecentProjects.map((row) => ({
      ...row,
      RiskCount: int64ToSafeNumber(row.RiskCount),
      UpdatedAt: int64ToSafeNumber(row.UpdatedAt),
    })),
  }
}

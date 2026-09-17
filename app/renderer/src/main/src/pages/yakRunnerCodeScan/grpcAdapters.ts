import type { GrpcOutput } from '@/services/ipc'
import { int64ToSafeNumber } from '@/utils/int64'

function scanKind(value: string): 'scan' | 'debug' {
  if (value === 'scan' || value === 'debug') return value
  throw new Error('未知扫描任务类型: ' + value)
}

function resultKind(value: string): 'query' | 'scan' | 'debug' {
  if (value === 'query') return value
  return scanKind(value)
}

export function syntaxFlowTasksForUI(value: GrpcOutput<'QuerySyntaxFlowScanTask'>) {
  return {
    ...value,
    Data: value.Data.map((row) => ({
      ...row,
      Kind: scanKind(row.Kind),
      CreatedAt: int64ToSafeNumber(row.CreatedAt),
      UpdatedAt: int64ToSafeNumber(row.UpdatedAt),
      RuleCount: int64ToSafeNumber(row.RuleCount),
      FailedQuery: int64ToSafeNumber(row.FailedQuery),
      SkipQuery: int64ToSafeNumber(row.SkipQuery),
      SuccessQuery: int64ToSafeNumber(row.SuccessQuery),
      RiskCount: int64ToSafeNumber(row.RiskCount),
      TotalQuery: int64ToSafeNumber(row.TotalQuery),
      NewRiskCount: int64ToSafeNumber(row.NewRiskCount),
      InfoCount: int64ToSafeNumber(row.InfoCount),
      LowCount: int64ToSafeNumber(row.LowCount),
      WarningCount: int64ToSafeNumber(row.WarningCount),
      CriticalCount: int64ToSafeNumber(row.CriticalCount),
      HighCount: int64ToSafeNumber(row.HighCount),
      NewInfoCount: int64ToSafeNumber(row.NewInfoCount),
      NewLowCount: int64ToSafeNumber(row.NewLowCount),
      NewWarningCount: int64ToSafeNumber(row.NewWarningCount),
      NewCriticalCount: int64ToSafeNumber(row.NewCriticalCount),
      NewHighCount: int64ToSafeNumber(row.NewHighCount),
    })),
  }
}

export function syntaxFlowResultsForUI(value: GrpcOutput<'QuerySyntaxFlowResult'>) {
  return {
    ...value,
    Results: value.Results.map((row) => ({
      ...row,
      Kind: resultKind(row.Kind),
      RiskCount: int64ToSafeNumber(row.RiskCount),
    })),
  }
}

export function ssaProgramsForUI(value: GrpcOutput<'QuerySSAPrograms'>) {
  return {
    ...value,
    Data: (value.Data.length ? value.Data : value.Programs).map((row) => ({
      ...row,
      CreateAt: int64ToSafeNumber(row.CreateAt),
      UpdateAt: int64ToSafeNumber(row.UpdateAt),
      HighRiskNumber: int64ToSafeNumber(row.HighRiskNumber),
      CriticalRiskNumber: int64ToSafeNumber(row.CriticalRiskNumber),
      WarnRiskNumber: int64ToSafeNumber(row.WarnRiskNumber),
      LowRiskNumber: int64ToSafeNumber(row.LowRiskNumber),
      InfoRiskNumber: int64ToSafeNumber(row.InfoRiskNumber),
    })),
    Pagination: value.Pagination ?? value.Paging,
  }
}

export function ssaProjectsForUI(value: GrpcOutput<'QuerySSAProject'>) {
  return {
    ...value,
    Projects: value.Projects.map((row) => ({
      ...row,
      CreateAt: int64ToSafeNumber(row.CreatedAt),
      UpdateAt: int64ToSafeNumber(row.UpdatedAt),
      RiskNumber: int64ToSafeNumber(row.RiskNumber),
      CompileTimes: int64ToSafeNumber(row.CompileTimes),
      CompileConfig: row.CompileConfig && {
        ...row.CompileConfig,
        PeepholeSize: int64ToSafeNumber(row.CompileConfig.PeepholeSize),
      },
    })),
  }
}

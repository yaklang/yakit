import { SyntaxFlowRuleFilter } from '../ruleManagement/RuleManagementType'
import { SSARisksFilter } from '../yakRunnerAuditHole/YakitAuditHoleTable/YakitAuditHoleTableType'

export interface IRifyHomeProps {}

export type RiskSeverity = 'serious' | 'high' | 'medium' | 'low'

export type AuditModeBadgeType = 'online' | 'offline' | 'none'

export type AuditModeVariant = 'primary' | 'secondary' | 'tertiary'

export interface IRifyHomeHeaderStat {
  label: string
  value: number
}

export interface IRifyHomeAuditModeCard {
  key: string
  title: string
  badge: string
  badgeType: AuditModeBadgeType
  subtitle?: string
  features: string[]
  tags: string[]
  buttonText: string
  variant: AuditModeVariant
}

export interface IRifyHomeRiskItem {
  key: RiskSeverity
  label: string
  enLabel: string
  percent: number
  count: number
}

export interface IRifyHomeRiskOverview {
  level: string
  levelLabel: string
  gaugeValue: number
  items: IRifyHomeRiskItem[]
}

export interface IRifyHomeDistributionItem {
  name: string
  value: number
  percent: number
}

export interface IRifyHomeRiskDistribution {
  total: number
  totalLabel: string
  items: IRifyHomeDistributionItem[]
}

export interface IRifyHomeRuleHit {
  name: string
  value: number
}

export interface IRifyHomeAiAuditResult {
  title: string
  severity: RiskSeverity
}

export interface IRifyHomeRecentProject {
  name: string
  language: string
  risk: RiskSeverity
  riskCount: number
  updateTime: string
}

export interface SSAWorkbenchSummary {
  ProjectCount: number
  RuleCount: number
  AIAuditTaskCount: number
}

export interface SSAWorkbenchRiskLevelItem {
  Severity: string
  Verbose: string
  Count: number
  Percent: number
}

export interface SSAWorkbenchRiskTypeItem {
  RiskType: string
  Verbose: string
  Count: number
  Percent: number
}

export interface SSAWorkbenchRuleHitItem {
  RuleName: string
  TitleVerbose: string
  HitCount: number
}

export interface SSAWorkbenchRecentProject {
  ID: number
  ProjectName: string
  Language: string
  HighestRiskSeverity: string
  HighestRiskVerbose: string
  RiskCount: number
  UpdatedAt: number
}

export interface GetSSAWorkbenchDashboardResponse {
  Summary: SSAWorkbenchSummary
  TotalRiskCount: number
  RiskOverview: SSAWorkbenchRiskLevelItem[]
  RiskDistribution: SSAWorkbenchRiskTypeItem[]
  TopRuleHits: SSAWorkbenchRuleHitItem[]
  RecentProjects: SSAWorkbenchRecentProject[]
}

export interface GetSSAWorkbenchDashboardRequest {
  // 风险统计范围（可选）
  RiskFilter?: SSARisksFilter
  // 近期项目条数，默认 5
  RecentProjectLimit?: number
  // 规则命中 TopN，默认 5
  TopRuleHitLimit?: number
  // 规则库计数筛选（可选，默认统计全部规则）
  RuleFilter?: SyntaxFlowRuleFilter
  // AI 审计任务计数：按 AISession.source 筛选（可选，空则统计全部会话）
  AIAuditSessionSources?: string[]
}

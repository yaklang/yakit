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

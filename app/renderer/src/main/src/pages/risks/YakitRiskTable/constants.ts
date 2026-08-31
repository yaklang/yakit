import type { QueryRisksRequest } from './YakitRiskTableType'
import type { TFunction } from '@/i18n/useI18nNamespaces'

export const defQueryRisksRequest: QueryRisksRequest = {
  Pagination: { Page: 1, Limit: 20, OrderBy: 'id', Order: 'desc' },
  Search: '',
  Network: '',
  Ports: '',
  RiskType: '',
  Token: '',
  WaitingVerified: false,
  Severity: '',
  FromId: 0,
  UntilId: 0,
  Tags: '',
  IsRead: '', // 全部'' 已读:'true'，未读：'false'
  Title: '',
  RiskTypeList: [],
  SeverityList: [],
  TagList: [],
  IPList: [],
  Ids: [],
  RuntimeId: '',
  RuntimeIds: [],
}

export const DEFAULT_RISK_TYPE_OPTIONS = [
  'SQL注入',
  'XSS',
  'SSRF',
  '未授权访问',
  'CSRF',
  '文件上传漏洞',
  '文件包含',
  '反序列化漏洞',
  '目录遍历',
]

/** 处置状态预设（可多选、可自定义输入）；value 存库中文不变 */
export const DISPOSAL_STATUS_REPAIRED = '已修复'

export const DISPOSAL_STATUS_OPTIONS = [
  { value: '待验证', labelKey: 'YakitRiskEditForm.pending_verify' },
  { value: '确认', labelKey: 'YakitRiskEditForm.confirmed' },
  { value: '已修复', labelKey: 'YakitRiskEditForm.repaired' },
  { value: '关闭', labelKey: 'YakitRiskEditForm.closed' },
] as const

export type DisposalStatus = (typeof DISPOSAL_STATUS_OPTIONS)[number]['value']

export interface CvssSeverityLevel {
  /** 写入接口的 severity */
  severity: 'none' | 'low' | 'warning' | 'high' | 'critical'
}

/** CVSS v3.x：0.0–10.0 → 等级 */
export const cvssToSeverityLevel = (score: number): CvssSeverityLevel => {
  if (score <= 0) return { severity: 'none' }
  if (score <= 3.9) return { severity: 'low' }
  if (score <= 6.9) return { severity: 'warning' }
  if (score <= 8.9) return { severity: 'high' }
  return { severity: 'critical' }
}

/** 从 tags 解析处置状态列表（含自定义，按 | 拆分） */
export const getDisposalStatusFromTags = (tags?: string): string[] => {
  if (!tags) return []
  return tags
    .split('|')
    .map((item) => item.trim())
    .filter(Boolean)
}

/** 表格展示：预设走 i18n，自定义原文 */
export const formatDisposalStatusDisplay = (tags: string | undefined, t: TFunction): string => {
  const list = getDisposalStatusFromTags(tags)
  if (!list.length) return '-'
  return list
    .map((value) => {
      const preset = DISPOSAL_STATUS_OPTIONS.find((item) => item.value === value)
      return preset ? t(preset.labelKey) : value
    })
    .join('、')
}

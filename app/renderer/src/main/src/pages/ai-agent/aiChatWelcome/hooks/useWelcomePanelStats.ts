import { useEffect, useState } from 'react'
import { grpcQueryHTTPFlows } from '../../grpc'
import { apiRiskFieldGroup, type RiskFieldGroupResponse } from '@/pages/risks/YakitRiskTable/utils'
import type { AIRightPanelRiskCounts } from '@/pages/ai-re-act/aiRightPanel/type'

/**
 * 与漏洞列表的等级别名保持一致，其余等级汇入信息。
 * 注意：任务快照侧另有固定字段的等级映射（AIRightPanel.tsx 的 ChatRightPanel），
 * 两处语义不同未合并——这里归并后端 RiskLevelGroup 的多别名，那边映射快照 risk_level_count 的固定字段；
 * 调整等级归并规则时两处需同步检查。
 */
const getRiskCounts = (groups: RiskFieldGroupResponse['RiskLevelGroup']): AIRightPanelRiskCounts => {
  const levels = new Map<string, keyof AIRightPanelRiskCounts>([
    ['fatal', 'serious'],
    ['critical', 'serious'],
    ['panic', 'serious'],
    ['high', 'high'],
    ['middle', 'medium'],
    ['warn', 'medium'],
    ['warning', 'medium'],
    ['medium', 'medium'],
    ['low', 'low'],
  ])
  return groups.reduce<AIRightPanelRiskCounts>((counts, group) => {
    const field = levels.get(group.Name) ?? 'info'
    counts[field] = (counts[field] ?? 0) + group.Total
    return counts
  }, {})
}

/** 外部刷新字段变为 true 时查询一次全量统计。 */
export const useWelcomePanelStats = (refresh: boolean) => {
  const [trafficTotal, setTrafficTotal] = useState<number>()
  const [riskCounts, setRiskCounts] = useState<AIRightPanelRiskCounts>()

  useEffect(() => {
    if (!refresh) return
    let cancelled = false
    // 不带会话、任务等筛选条件，仅限制列表返回量。
    grpcQueryHTTPFlows({ Pagination: { Page: 1, Limit: 1 } })
      .then((res) => {
        if (!cancelled) setTrafficTotal(res.Total)
      })
      .catch(() => {})
    apiRiskFieldGroup()
      .then((res) => {
        if (!cancelled) setRiskCounts(getRiskCounts(res.RiskLevelGroup))
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [refresh])

  const riskTotal = Object.values(riskCounts ?? {}).reduce((total, count) => total + count, 0)
  return { trafficTotal, riskTotal, riskCounts }
}

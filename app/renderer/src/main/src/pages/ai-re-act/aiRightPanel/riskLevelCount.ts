import type { AIRightPanelRiskCounts } from './type'

/** 会话快照 risk_level_count 的固定字段结构（与 grpcApi SessionSnapshot.execution 一致） */
export type SessionRiskLevelCount = {
  critical?: number
  high?: number
  warning?: number
  low?: number
  info?: number
  other?: number
  total?: number
}

/** 漏洞计数角标的展示顺序；后端标准等级映射到设计稿中的五种颜色。 */
export const RISK_TAG_ORDER: Array<keyof AIRightPanelRiskCounts> = ['serious', 'high', 'medium', 'low', 'info']

/**
 * 将会话快照 risk_level_count 映射为右侧面板 / 任务详情展示用的五档计数。
 * critical→serious，warning→medium，info+other→info。
 * 首页全量统计侧的多别名归并见 useWelcomePanelStats.getRiskCounts，语义不同未合并。
 */
export const mapSessionRiskLevelCount = (levelCount: SessionRiskLevelCount): AIRightPanelRiskCounts => ({
  serious: levelCount.critical,
  high: levelCount.high,
  medium: levelCount.warning,
  low: levelCount.low,
  info: (levelCount.info ?? 0) + (levelCount.other ?? 0),
})

/** 按 RISK_TAG_ORDER 展开非零等级条目，供角标 / 指标卡渲染 */
export const getRiskTagEntries = (riskCounts: AIRightPanelRiskCounts) =>
  RISK_TAG_ORDER.map((field) => ({ field, value: riskCounts[field] })).filter((entry) => !!entry.value)

/** 从快照等级计数直接得到非零展示条目；无 levelCount 时返回空数组 */
export const getSessionRiskTagEntries = (levelCount?: SessionRiskLevelCount | null) => {
  if (!levelCount) return []
  return getRiskTagEntries(mapSessionRiskLevelCount(levelCount))
}

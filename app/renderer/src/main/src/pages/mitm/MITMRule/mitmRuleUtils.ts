import type { MITMContentReplacerRule } from './MITMRuleType'

/**
 * 将规则按启用/禁用分组（启用在前、禁用在后），并按数组位置重算 Index 为 1..N。
 * 用于会改变 Disabled 状态的入口（onBan / onAllBan / 加载 / 保存排序）。
 */
export const sortMitmRules = (rules: MITMContentReplacerRule[]): MITMContentReplacerRule[] => {
  const showRules: MITMContentReplacerRule[] = []
  const banRules: MITMContentReplacerRule[] = []
  rules.forEach((item) => {
    if (item.Disabled) {
      banRules.push(item)
    } else {
      showRules.push(item)
    }
  })
  return [...showRules, ...banRules].map((item, index) => ({ ...item, Index: index + 1 }))
}

/**
 * 按数组位置重算 Index 为 1..N，不改变顺序。
 * 用于删除等位置变化但不需要禁用项沉底的入口。
 */
export const resetMitmRulesIndex = (rules: MITMContentReplacerRule[]): MITMContentReplacerRule[] => {
  return rules.map((item, index) => ({ ...item, Index: index + 1 }))
}

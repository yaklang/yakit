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

/** 关键字搜索结果与命中颜色、替换结果筛选叠加后的表格数据。 */
export const filterMitmRuleRows = (
  rules: MITMContentReplacerRule[],
  searchFlag: boolean,
  searchRules: MITMContentReplacerRule[],
  colorFilter: string[],
  noReplaceFilter: string[],
): MITMContentReplacerRule[] => {
  let list = searchFlag ? searchRules : rules
  if (colorFilter.length > 0) {
    list = list.filter((item) => colorFilter.includes(item.Color || ''))
  }
  if (noReplaceFilter.length > 0) {
    list = list.filter((item) => noReplaceFilter.includes(String(item.NoReplace)))
  }
  return list
}

/** 将指定规则移到数组首位并重算 Index，不改变其余相对顺序。 */
export const moveMitmRuleToTop = (
  rules: MITMContentReplacerRule[],
  row: MITMContentReplacerRule,
): MITMContentReplacerRule[] => {
  const rest = rules.filter((item) => item.Id !== row.Id)
  return resetMitmRulesIndex([row, ...rest])
}

/** 搜索或列筛选进行中时，展示数据不是 rules 原序，禁止拖拽。 */
export const canDragMitmRules = (searchFlag: boolean, colorFilter: string[], noReplaceFilter: string[]) =>
  !searchFlag && colorFilter.length === 0 && noReplaceFilter.length === 0

/** 禁用规则，以及搜索/筛选态，都不执行置顶。 */
export const canMoveMitmRuleToTop = (disabled: boolean, enableDrag: boolean) => !(disabled || !enableDrag)

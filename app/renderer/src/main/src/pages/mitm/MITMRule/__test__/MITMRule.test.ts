import { describe, expect, it } from 'vitest'
import type { MITMContentReplacerRule } from '../MITMRuleType'
import { canDragMitmRules, canMoveMitmRuleToTop, filterMitmRuleRows, moveMitmRuleToTop } from '../mitmRuleUtils'

const makeRule = (overrides: Partial<MITMContentReplacerRule> = {}): MITMContentReplacerRule => ({
  Id: 1,
  Index: 1,
  Rule: '',
  ExactMatch: false,
  RegexpGroups: [],
  NoReplace: false,
  Result: '',
  EffectiveURL: '',
  Color: '',
  EnableForRequest: false,
  EnableForResponse: false,
  EnableForBody: false,
  EnableForHeader: false,
  EnableForURI: false,
  ExtraRepeat: false,
  Drop: false,
  ExtraTag: [],
  Disabled: false,
  VerboseName: '',
  ExtraHeaders: [],
  ExtraCookies: [],
  ...overrides,
})

describe('filterMitmRuleRows', () => {
  const rules = [
    makeRule({ Id: 1, Color: 'red', NoReplace: false }),
    makeRule({ Id: 2, Color: 'red', NoReplace: true }),
    makeRule({ Id: 3, Color: 'blue', NoReplace: true }),
    makeRule({ Id: 4, Color: '', NoReplace: false }),
  ]

  it('未搜索且无列筛选时返回原列表', () => {
    expect(filterMitmRuleRows(rules, false, [], [], []).map((r) => r.Id)).toEqual([1, 2, 3, 4])
  })

  it('搜索态以 searchRules 为底，再叠加颜色和替换筛选', () => {
    const searchRules = [rules[1], rules[2], rules[0]]
    const result = filterMitmRuleRows(rules, true, searchRules, ['red'], ['true'])
    expect(result.map((r) => r.Id)).toEqual([2])
  })

  it('空颜色匹配无颜色规则', () => {
    const result = filterMitmRuleRows(rules, false, [], [''], [])
    expect(result.map((r) => r.Id)).toEqual([4])
  })

  it('只选替换结果时不按颜色过滤', () => {
    const result = filterMitmRuleRows(rules, false, [], [], ['false'])
    expect(result.map((r) => r.Id)).toEqual([1, 4])
  })
})

describe('moveMitmRuleToTop', () => {
  it('把目标规则放到首位并重算 Index', () => {
    const rules = [makeRule({ Id: 1, Index: 1 }), makeRule({ Id: 2, Index: 2 }), makeRule({ Id: 3, Index: 3 })]
    const result = moveMitmRuleToTop(rules, rules[2])
    expect(result.map((r) => r.Id)).toEqual([3, 1, 2])
    expect(result.map((r) => r.Index)).toEqual([1, 2, 3])
  })

  it('不修改原数组', () => {
    const rules = [makeRule({ Id: 1, Index: 1 }), makeRule({ Id: 2, Index: 2 })]
    moveMitmRuleToTop(rules, rules[1])
    expect(rules.map((r) => r.Id)).toEqual([1, 2])
    expect(rules.map((r) => r.Index)).toEqual([1, 2])
  })
})

describe('置顶是否可执行', () => {
  it('搜索或列筛选时禁止拖拽，置顶也不执行', () => {
    expect(canDragMitmRules(true, [], [])).toBe(false)
    expect(canDragMitmRules(false, ['red'], [])).toBe(false)
    expect(canDragMitmRules(false, [], ['true'])).toBe(false)
    expect(canMoveMitmRuleToTop(false, canDragMitmRules(true, [], []))).toBe(false)
  })

  it('普通列表中未禁用的规则可以置顶', () => {
    expect(canDragMitmRules(false, [], [])).toBe(true)
    expect(canMoveMitmRuleToTop(false, true)).toBe(true)
  })

  it('禁用规则不能置顶', () => {
    expect(canMoveMitmRuleToTop(true, true)).toBe(false)
  })
})

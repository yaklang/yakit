import { describe, expect, it } from 'vitest'
import type { MITMContentReplacerRule } from '../MITMRuleType'
import { sortMitmRules, resetMitmRulesIndex } from '../mitmRuleUtils'

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

describe('sortMitmRules', () => {
  it('启用项排在前、禁用项排在后，且 Index 按位置重编为 1..N', () => {
    const rules = [
      makeRule({ Id: 1, Disabled: true }),
      makeRule({ Id: 2, Disabled: false }),
      makeRule({ Id: 3, Disabled: true }),
      makeRule({ Id: 4, Disabled: false }),
    ]
    const sorted = sortMitmRules(rules)
    expect(sorted.map((r) => r.Id)).toEqual([2, 4, 1, 3])
    expect(sorted.map((r) => r.Index)).toEqual([1, 2, 3, 4])
  })

  it('禁用某条后该条 Index 不再停留在旧值（本次 bug 的回归用例）', () => {
    // 模拟 onBan：原本 [启用1, 启用2, 启用3]，禁用第 2 条后应沉底且 Index 重算
    const rules = [
      makeRule({ Id: 1, Disabled: false }),
      makeRule({ Id: 2, Disabled: false }),
      makeRule({ Id: 3, Disabled: false }),
    ]
    const toggled = rules.map((r) => (r.Id === 2 ? { ...r, Disabled: true } : r))
    const sorted = sortMitmRules(toggled)
    expect(sorted.map((r) => r.Id)).toEqual([1, 3, 2])
    expect(sorted.map((r) => r.Index)).toEqual([1, 2, 3])
  })

  it('全部禁用时仍重编为 1..N', () => {
    const rules = [makeRule({ Id: 5, Disabled: true, Index: 9 }), makeRule({ Id: 6, Disabled: true, Index: 3 })]
    const sorted = sortMitmRules(rules)
    expect(sorted.map((r) => r.Index)).toEqual([1, 2])
  })

  it('不修改原数组', () => {
    const rules = [makeRule({ Id: 1, Disabled: false, Index: 5 })]
    sortMitmRules(rules)
    expect(rules[0].Index).toBe(5)
  })
})

describe('resetMitmRulesIndex', () => {
  it('按位置重编 Index，不改变顺序', () => {
    const rules = [makeRule({ Id: 1, Index: 3 }), makeRule({ Id: 2, Index: 7 }), makeRule({ Id: 3, Index: 1 })]
    const result = resetMitmRulesIndex(rules)
    expect(result.map((r) => r.Id)).toEqual([1, 2, 3])
    expect(result.map((r) => r.Index)).toEqual([1, 2, 3])
  })

  it('删除一条后 Index 无空洞（onRemove 的回归用例）', () => {
    const rules = [makeRule({ Id: 1, Index: 1 }), makeRule({ Id: 2, Index: 2 }), makeRule({ Id: 3, Index: 3 })]
    const afterRemove = rules.filter((r) => r.Id !== 2)
    const result = resetMitmRulesIndex(afterRemove)
    expect(result.map((r) => r.Id)).toEqual([1, 3])
    expect(result.map((r) => r.Index)).toEqual([1, 2])
  })
})

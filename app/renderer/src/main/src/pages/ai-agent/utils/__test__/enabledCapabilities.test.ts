import { describe, expect, it } from 'vitest'
import { mergeAIEnabledCapabilities } from '../enabledCapabilities'

describe('mergeAIEnabledCapabilities', () => {
  it('按 type:name 去重，同时保留不同类型的同名能力', () => {
    // 同一个 Skill 只发送一次；同名 Tool 是另一种能力，预期保留。
    expect(
      mergeAIEnabledCapabilities(
        [{ Type: 'skill', Name: 'code-review' }],
        [
          { Type: 'skill', Name: 'code-review' },
          { Type: 'tool', Name: 'code-review' },
        ],
      ),
    ).toEqual([
      { Type: 'skill', Name: 'code-review' },
      { Type: 'tool', Name: 'code-review' },
    ])
  })

  it('忽略不完整能力，避免向后端发送不可查询项', () => {
    // 空 type 或 name 无法参与 Capability lookup，预期直接过滤。
    expect(
      mergeAIEnabledCapabilities([
        { Type: '', Name: 'code-review' },
        { Type: 'skill', Name: ' ' },
        { Type: 'skill', Name: 'security-engineering' },
      ]),
    ).toEqual([{ Type: 'skill', Name: 'security-engineering' }])
  })
})

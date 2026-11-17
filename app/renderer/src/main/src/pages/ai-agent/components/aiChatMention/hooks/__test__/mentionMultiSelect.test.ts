import { describe, expect, it } from 'vitest'
import { resolveMentionPointerSelect } from '../mentionMultiSelect'

const keys = ['a', 'b', 'c', 'd']

describe('resolveMentionPointerSelect', () => {
  it('普通点击交给调用方立即提交', () => {
    expect(
      resolveMentionPointerSelect({
        orderedKeys: keys,
        checkedKeys: ['a'],
        anchorKey: 'a',
        clickedKey: 'b',
        modifiers: {},
      }),
    ).toBeNull()
  })

  it('Ctrl 或 Cmd 切换单项，并按列表顺序保留结果', () => {
    expect(
      resolveMentionPointerSelect({
        orderedKeys: keys,
        checkedKeys: ['c'],
        clickedKey: 'a',
        modifiers: { ctrlKey: true },
      }),
    ).toEqual({ checkedKeys: ['a', 'c'], anchorKey: 'a' })

    expect(
      resolveMentionPointerSelect({
        orderedKeys: keys,
        checkedKeys: ['a', 'c'],
        clickedKey: 'c',
        modifiers: { metaKey: true },
      }),
    ).toEqual({ checkedKeys: ['a'], anchorKey: 'c' })
  })

  it('Shift 从锚点选中一段，Ctrl+Shift 把这段并入已选项', () => {
    expect(
      resolveMentionPointerSelect({
        orderedKeys: keys,
        checkedKeys: [],
        anchorKey: 'b',
        clickedKey: 'd',
        modifiers: { shiftKey: true },
      }),
    ).toEqual({ checkedKeys: ['b', 'c', 'd'], anchorKey: 'b' })

    expect(
      resolveMentionPointerSelect({
        orderedKeys: keys,
        checkedKeys: ['a'],
        anchorKey: 'c',
        clickedKey: 'b',
        modifiers: { ctrlKey: true, shiftKey: true },
      }),
    ).toEqual({ checkedKeys: ['a', 'b', 'c'], anchorKey: 'c' })
  })

  it('锚点已不在列表中时，Shift 只选中当前点击项', () => {
    expect(
      resolveMentionPointerSelect({
        orderedKeys: keys,
        checkedKeys: ['a'],
        anchorKey: 'gone',
        clickedKey: 'c',
        modifiers: { shiftKey: true },
      }),
    ).toEqual({ checkedKeys: ['c'], anchorKey: 'c' })
  })

  it('点击项不在列表中时，回退为只选中该项', () => {
    expect(
      resolveMentionPointerSelect({
        orderedKeys: keys,
        checkedKeys: ['a'],
        anchorKey: 'a',
        clickedKey: 'missing',
        modifiers: { shiftKey: true },
      }),
    ).toEqual({ checkedKeys: ['missing'], anchorKey: 'missing' })
  })
})

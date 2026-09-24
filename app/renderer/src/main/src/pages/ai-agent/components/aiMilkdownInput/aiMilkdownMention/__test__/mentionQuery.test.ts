import { describe, expect, it } from 'vitest'
import { extractMentionFilterKeyword, getMentionQueryDeleteRange } from '../mentionQuery'

describe('extractMentionFilterKeyword', () => {
  it.each([
    ['仅 @', '@', ''],
    ['@ 后筛选词', '@abc', 'abc'],
    ['前文 + @query', 'hello @foo', 'foo'],
    ['中文筛选', '@知识', '知识'],
    ['含符号', '@a-b_c', 'a-b_c'],
  ])('%s → 提取筛选词', (_label, content, expected) => {
    expect(extractMentionFilterKeyword(content)).toBe(expected)
  })

  it.each([
    ['无 @', 'hello'],
    ['@ 后已有空白', '@abc '],
    ['空串', ''],
    ['null', null],
    ['undefined', undefined],
  ])('%s → null（不打开面板）', (_label, content) => {
    expect(extractMentionFilterKeyword(content as string | null | undefined)).toBeNull()
  })
})

describe('getMentionQueryDeleteRange', () => {
  it('仅 @：删除 1 个字符', () => {
    expect(getMentionQueryDeleteRange(10, 'xxxx@')).toEqual({ from: 9, to: 10 })
  })

  it('@query：整段含 @ 一并删除', () => {
    expect(getMentionQueryDeleteRange(15, 'hi @foobar')).toEqual({ from: 8, to: 15 })
  })

  it('光标前无 @query：不删', () => {
    expect(getMentionQueryDeleteRange(5, 'hello')).toBeNull()
  })

  it('@ 后已有空白：不删（已结束 mention）', () => {
    expect(getMentionQueryDeleteRange(6, '@abc ')).toBeNull()
  })
})

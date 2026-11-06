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
    ['邮箱', 'xxx@qq.com'],
    ['邮箱前有文案', '联系 xxx@qq.com'],
    ['粘贴带尖括号的 URL 内无独立 @', '<http://localhost:3000/>'],
  ])('%s → null（不打开面板）', (_label, content) => {
    expect(extractMentionFilterKeyword(content as string | null | undefined)).toBeNull()
  })
})

describe('getMentionQueryDeleteRange', () => {
  it('仅 @：删除 1 个字符', () => {
    expect(getMentionQueryDeleteRange(5, 'xxxx@')).toBeNull()
    expect(getMentionQueryDeleteRange(1, '@')).toEqual({ from: 0, to: 1 })
  })

  it('@query：整段含 @ 一并删除，不删前置空白', () => {
    expect(getMentionQueryDeleteRange(10, 'hi @foobar')).toEqual({ from: 3, to: 10 })
  })

  it('光标前无独立 @query：不删', () => {
    expect(getMentionQueryDeleteRange(5, 'hello')).toBeNull()
    expect(getMentionQueryDeleteRange(10, 'xxx@qq.com')).toBeNull()
  })

  it('@ 后已有空白：不删（已结束 mention）', () => {
    expect(getMentionQueryDeleteRange(6, '@abc ')).toBeNull()
  })
})

import { describe, expect, it } from 'vitest'
import { extractModeSlashFilterKeyword, getModeSlashQueryDeleteRange } from '../modeSlashQuery'

describe('extractModeSlashFilterKeyword', () => {
  it.each([
    ['仅 /', '/', ''],
    ['/ 后筛选词', '/plan', 'plan'],
    ['前文 + /query', 'hello /goal', 'goal'],
  ])('%s → 提取筛选词', (_label, content, expected) => {
    expect(extractModeSlashFilterKeyword(content)).toBe(expected)
  })

  it.each([
    ['无 /', 'hello'],
    ['/ 后已有空白', '/plan '],
    ['空串', ''],
    ['null', null],
    ['undefined', undefined],
    ['URL 尾部斜杠', 'http://localhost:3000/'],
    ['尖括号自动链接 URL', '<http://localhost:3000/>'],
    ['路径中的斜杠', '查看 docs/api'],
    ['协议双斜杠', 'http://'],
  ])('%s → null（不打开模式选择）', (_label, content) => {
    expect(extractModeSlashFilterKeyword(content as string | null | undefined)).toBeNull()
  })
})

describe('getModeSlashQueryDeleteRange', () => {
  it('仅 /：删除 1 个字符', () => {
    expect(getModeSlashQueryDeleteRange(5, 'xxxx/')).toBeNull()
    expect(getModeSlashQueryDeleteRange(1, '/')).toEqual({ from: 0, to: 1 })
  })

  it('/query：整段含 / 一并删除，不删前置空白', () => {
    expect(getModeSlashQueryDeleteRange(10, 'hi /foobar')).toEqual({ from: 3, to: 10 })
  })

  it('光标前无独立 /query：不删', () => {
    expect(getModeSlashQueryDeleteRange(5, 'hello')).toBeNull()
    expect(getModeSlashQueryDeleteRange(22, 'http://localhost:3000/')).toBeNull()
  })
})

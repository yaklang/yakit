import { describe, expect, it } from 'vitest'
import { mergeDisposalLogs } from '../disposalLog'

interface LogEntry {
  id: number
  description?: string
  parentComment?: { id: number; description: string }
}

describe('mergeDisposalLogs', () => {
  it('加载原评论所在页后补齐已有回复的引用，并保持输入不可变', () => {
    const reply = { id: 30, description: '回复', parentComment: { id: 1, description: '' } }
    const previous = mergeDisposalLogs<LogEntry>([], [reply])
    const result = mergeDisposalLogs(previous, [{ id: 1, description: '原评论' }])

    expect(result.map((item) => item.id)).toEqual([30, 1])
    expect(result[0].parentComment?.description).toBe('原评论')
    expect(reply.parentComment.description).toBe('')
    expect(previous[0].parentComment?.description).toBe('')
    expect(result[0].parentComment).not.toBe(reply.parentComment)
  })

  it('新加载的回复可以引用之前已加载的原评论', () => {
    const result = mergeDisposalLogs(
      [{ id: 1, description: '原评论' }],
      [{ id: 30, parentComment: { id: 1, description: '' } }],
    )

    expect(result[1].parentComment?.description).toBe('原评论')
  })

  it('重叠页更新原评论时同步更新引用，原评论未加载时保留已有引用', () => {
    const reply = { id: 30, parentComment: { id: 1, description: '旧内容' } }
    expect(mergeDisposalLogs([], [reply])[0]).toBe(reply)
    const result = mergeDisposalLogs<LogEntry>([reply], [{ id: 1, description: '新内容' }])

    expect(result[0].parentComment?.description).toBe('新内容')
    expect(reply.parentComment.description).toBe('旧内容')
  })

  it('保留后端返回顺序，不再按创建时间或 id 排序', () => {
    const result = mergeDisposalLogs(
      [],
      [
        { id: 30, createdAt: 100 },
        { id: 10, createdAt: 300 },
        { id: 20, createdAt: 300 },
      ],
    )

    expect(result.map((item) => item.id)).toEqual([30, 10, 20])
  })

  it('按页追加，重叠记录原位更新并按 id 去重', () => {
    const result = mergeDisposalLogs(
      [
        { id: 4, createdAt: 200, value: 'old' },
        { id: 2, createdAt: 100, value: 'page-one' },
      ],
      [
        { id: 3, createdAt: 200, value: 'page-two' },
        { id: 2, createdAt: 100, value: 'updated' },
      ],
    )

    expect(result.map((item) => item.id)).toEqual([4, 2, 3])
    expect(result.find((item) => item.id === 2)?.value).toBe('updated')
  })

  it('刷新使用空列表合并时保留后端返回顺序', () => {
    const result = mergeDisposalLogs(
      [],
      [
        { id: 1, createdAt: 100 },
        { id: 2, createdAt: 300 },
      ],
    )

    expect(result.map((item) => item.id)).toEqual([1, 2])
  })
})

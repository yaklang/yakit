import { describe, expect, it } from 'vitest'
import { mergeDisposalLogs } from '../disposalLog'

describe('mergeDisposalLogs', () => {
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

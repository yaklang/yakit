import { describe, expect, it } from 'vitest'
import { mergeDisposalLogs } from '../disposalLog'

describe('mergeDisposalLogs', () => {
  it('按创建时间倒序排列，不受 id 大小影响', () => {
    const result = mergeDisposalLogs([], [
      { id: 30, createdAt: 100 },
      { id: 10, createdAt: 300 },
      { id: 20, createdAt: 200 },
    ])

    expect(result.map((item) => item.id)).toEqual([10, 20, 30])
  })

  it('同一时间按 id 倒序，并在分页合并时按 id 去重', () => {
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

    expect(result.map((item) => item.id)).toEqual([4, 3, 2])
    expect(result.find((item) => item.id === 2)?.value).toBe('updated')
  })

  it('刷新使用空列表合并时让最新记录置顶', () => {
    const result = mergeDisposalLogs([], [
      { id: 1, createdAt: 100 },
      { id: 2, createdAt: 300 },
    ])

    expect(result.map((item) => item.id)).toEqual([2, 1])
  })
})

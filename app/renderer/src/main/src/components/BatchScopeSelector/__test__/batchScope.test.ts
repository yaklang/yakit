import { describe, expect, it } from 'vitest'
import { buildBatchScopes } from '../batchScope'

describe('buildBatchScopes', () => {
  it.each([
    [0, []],
    [1, [[1, 1, 1, 1000]]],
    [1000, [[1, 1000, 1000, 1000]]],
    [
      1001,
      [
        [1, 1000, 1000, 1000],
        [1001, 1001, 1, 1000],
      ],
    ],
    [
      2000,
      [
        [1, 1000, 1000, 1000],
        [1001, 2000, 1000, 1000],
      ],
    ],
    [
      2501,
      [
        [1, 1000, 1000, 1000],
        [1001, 2000, 1000, 1000],
        [2001, 2501, 501, 1000],
      ],
    ],
  ])('builds page metadata for %i records', (total, expected) => {
    expect(buildBatchScopes(total).map(({ start, end, count, limit }) => [start, end, count, limit])).toEqual(expected)
  })

  it('rejects invalid totals and limits', () => {
    expect(() => buildBatchScopes(-1)).toThrow()
    expect(() => buildBatchScopes(Number.NaN)).toThrow()
    expect(() => buildBatchScopes(1, 0)).toThrow()
  })
})

import { describe, expect, it } from 'vitest'
import { appendFuzzerRow, appendIndexedFuzzerRow } from '../fuzzerRowLimit'

describe('appendFuzzerRow', () => {
  it('drops the oldest rows once the list passes the limit', () => {
    const list = ['a', 'b']
    const evicted: string[] = []
    appendFuzzerRow(list, 'c', 2, (row) => evicted.push(row))
    expect(list).toEqual(['b', 'c'])
    expect(evicted).toEqual(['a'])
  })

  it('keeps every row when the limit is not positive', () => {
    const list = ['a']
    appendFuzzerRow(list, 'b', 0)
    expect(list).toEqual(['a', 'b'])
  })
})

describe('appendIndexedFuzzerRow', () => {
  it('stores each fuzzer index separately and trims that index only', () => {
    const bucket = new Map<string, string[]>()
    const evicted: string[] = []
    appendIndexedFuzzerRow(bucket, 'alpha', 'a1', 1, (row) => evicted.push(row))
    appendIndexedFuzzerRow(bucket, 'alpha', 'a2', 1, (row) => evicted.push(row))
    appendIndexedFuzzerRow(bucket, 'beta', 'b1', 1)
    expect(bucket.get('alpha')).toEqual(['a2'])
    expect(bucket.get('beta')).toEqual(['b1'])
    expect(evicted).toEqual(['a1'])
  })
})

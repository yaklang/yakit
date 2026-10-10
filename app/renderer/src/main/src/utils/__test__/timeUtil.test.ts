import { describe, expect, it } from 'vitest'
import { getDateFromUnixTimestamp } from '../timeUtil'

describe('业务日期时间戳转换', () => {
  it.each([undefined, null, '', ' ', 0, '0', -1, 'invalid', NaN, Infinity, 1e20])(
    '未设置或无效值 %s 留空，不回填成 1970 年',
    (value) => {
      expect(getDateFromUnixTimestamp(value)).toBeUndefined()
    },
  )

  it.each([1700000000, '1700000000'])('保留有效日期 %s，包括字符串时间戳', (value) => {
    expect(getDateFromUnixTimestamp(value)?.unix()).toBe(1700000000)
  })
})

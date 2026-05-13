import { describe, expect, it } from 'vitest'
import {
  filterData,
  getHTTPFlowReqAndResToString,
  onConvertBodySizeByUnit,
} from '@/components/HTTPFlowTable/Vitest__Test__'

describe('HTTPFlowTable Vitest helpers', () => {
  it('converts request and response payloads to strings', () => {
    const result = getHTTPFlowReqAndResToString({
      Id: 1,
      Request: new Uint8Array([72, 73]),
      Response: new Uint8Array([79, 75]),
    })

    expect(result).toMatchObject({
      Id: 1,
      RequestString: 'HI',
      ResponseString: 'OK',
    })
  })

  it('returns empty strings when payload is missing', () => {
    const result = getHTTPFlowReqAndResToString({ Id: 2 })
    expect(result).toMatchObject({
      Id: 2,
      RequestString: '',
      ResponseString: '',
    })
  })

  it('deduplicates rows by a given key', () => {
    const result = filterData(
      [
        { Id: 1, Path: '/a' },
        { Id: 1, Path: '/b' },
        { Id: 2, Path: '/c' },
      ],
      'Id',
    )

    expect(result).toEqual([
      { Id: 1, Path: '/a' },
      { Id: 2, Path: '/c' },
    ])
  })

  it('converts body length values across units', () => {
    expect(onConvertBodySizeByUnit(2, 'B')).toBe(2)
    expect(onConvertBodySizeByUnit(2, 'K')).toBe(2048)
    expect(onConvertBodySizeByUnit(2, 'M')).toBe(2097152)
  })

  it('handles empty array in filterData', () => {
    const result = filterData([], 'Id')
    expect(result).toEqual([])
  })

  it('handles single item in filterData', () => {
    const result = filterData([{ Id: 1, Path: '/a' }], 'Id')
    expect(result).toEqual([{ Id: 1, Path: '/a' }])
  })
})

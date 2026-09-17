import { describe, expect, it } from 'vitest'
import { int64String, int64ToSafeNumber, positiveInt64 } from '../int64'

describe('int64 boundaries', () => {
  it('preserves the full signed range and normalizes old safe numeric IDs', () => {
    expect(int64String('9223372036854775807')).toBe('9223372036854775807')
    expect(int64String('-9223372036854775808')).toBe('-9223372036854775808')
    expect(int64String(42)).toBe('42')
  })
  it('rejects rounded numbers and out-of-range values', () => {
    expect(() => int64String(9007199254740992)).toThrow(RangeError)
    expect(() => int64String('9223372036854775808')).toThrow(RangeError)
    expect(() => int64String('1,"limit":0')).toThrow(TypeError)
  })
  it('allows safe timestamp conversion but keeps wide IDs out of number APIs', () => {
    expect(int64ToSafeNumber('1700000000')).toBe(1700000000)
    expect(() => int64ToSafeNumber('9223372036854775807')).toThrow(RangeError)
  })
  it('preserves optional plugin IDs and retains fallback semantics for zero', () => {
    expect(positiveInt64('9007199254740993')).toBe('9007199254740993')
    expect(positiveInt64('0') || positiveInt64('9007199254740993')).toBe('9007199254740993')
    expect(positiveInt64(undefined)).toBeUndefined()
  })
})

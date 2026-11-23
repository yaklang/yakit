import { describe, expect, it } from 'vitest'
import {
  getGoalDurationDisplayLabel,
  goalDurationKeyToSeconds,
  goalDurationSecondsToKey,
  isGoalDurationPresetKey,
} from '../constants'

describe('goalDurationKeyToSeconds', () => {
  it.each([
    ['30m', 1800],
    ['1h', 3600],
    ['3h', 10800],
    ['never', -1],
  ] as const)('preset %s → %s', (key, seconds) => {
    expect(goalDurationKeyToSeconds(key)).toBe(seconds)
  })

  it('numeric string key 原样转为秒数', () => {
    expect(goalDurationKeyToSeconds('7200')).toBe(7200)
    expect(goalDurationKeyToSeconds('-1')).toBe(-1)
  })

  it('未知非数字 key 回落为 0', () => {
    expect(goalDurationKeyToSeconds('')).toBe(0)
    expect(goalDurationKeyToSeconds('custom')).toBe(0)
    expect(goalDurationKeyToSeconds('NaN')).toBe(0)
  })
})

describe('goalDurationSecondsToKey', () => {
  it('0 表示未设置，返回 null', () => {
    expect(goalDurationSecondsToKey(0)).toBeNull()
  })

  it.each([
    [1800, '30m'],
    [3600, '1h'],
    [10800, '3h'],
    [-1, 'never'],
  ] as const)('preset seconds %s → %s', (seconds, key) => {
    expect(goalDurationSecondsToKey(seconds)).toBe(key)
  })

  it('未知秒数回落为数字字符串以便展示', () => {
    expect(goalDurationSecondsToKey(7200)).toBe('7200')
    expect(goalDurationSecondsToKey(18000)).toBe('18000')
    expect(goalDurationSecondsToKey(1)).toBe('1')
  })
})

describe('isGoalDurationPresetKey', () => {
  it('识别预设 key', () => {
    expect(isGoalDurationPresetKey('1h')).toBe(true)
    expect(isGoalDurationPresetKey('never')).toBe(true)
  })

  it('拒绝未知秒数字符串', () => {
    expect(isGoalDurationPresetKey('7200')).toBe(false)
    expect(isGoalDurationPresetKey('')).toBe(false)
  })
})

describe('getGoalDurationDisplayLabel', () => {
  it.each([
    ['30m', '30m'],
    ['never', 'AIMilkdownModeSlash.durationNever'],
    ['custom', 'AIRunModeSelect.customDuration'],
    ['7200', '2h'],
    ['4500', '1h15m'],
    ['90', '1m30s'],
  ])('displays Goal duration %s as %s', (key, label) => {
    expect(getGoalDurationDisplayLabel(key, (value) => value)).toBe(label)
  })
})

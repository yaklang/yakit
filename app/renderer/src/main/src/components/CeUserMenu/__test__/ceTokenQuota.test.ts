import { describe, expect, it } from 'vitest'
import {
  getBalanceYuanText,
  getTokenLimit,
  getTokenPercent,
  getTokenRemaining,
  getTokenRemainingPercent,
  getTokenUsed,
} from '../ceTokenQuota'

describe('ceTokenQuota', () => {
  describe('getTokenLimit / getTokenUsed', () => {
    it('converts raw counts to megatokens', () => {
      expect(getTokenLimit({ tokenLimit: 100_000_000 })).toBe(100)
      expect(getTokenUsed({ tokenUsed: 25_000_000 })).toBe('25.00')
    })

    it('returns 0 when limit or used is missing or not positive', () => {
      expect(getTokenLimit({})).toBe(0)
      expect(getTokenLimit({ tokenLimit: 0 })).toBe(0)
      expect(getTokenUsed({})).toBe(0)
      expect(getTokenUsed({ tokenUsed: 0 })).toBe(0)
    })
  })

  describe('getTokenPercent (used)', () => {
    it('floors used percent and clamps to 100', () => {
      expect(getTokenPercent({ tokenUsed: 25_000_000, tokenLimit: 100_000_000 })).toBe(25)
      expect(getTokenPercent({ tokenUsed: 150_000_000, tokenLimit: 100_000_000 })).toBe(100)
    })

    it('returns 0 when used or limit is not positive', () => {
      expect(getTokenPercent({ tokenUsed: 0, tokenLimit: 100_000_000 })).toBe(0)
      expect(getTokenPercent({ tokenUsed: 10, tokenLimit: 0 })).toBe(0)
    })
  })

  describe('getTokenRemaining', () => {
    it('returns remaining megatokens as integer when whole', () => {
      expect(getTokenRemaining({ tokenUsed: 0, tokenLimit: 100_000_000 })).toBe(100)
      expect(getTokenRemaining({ tokenUsed: 40_000_000, tokenLimit: 100_000_000 })).toBe(60)
    })

    it('keeps two decimals when remaining is fractional', () => {
      // used 12_345_678 -> 12.345678M -> toFixed(2) = 12.35; limit 100M -> 87.65
      expect(getTokenRemaining({ tokenUsed: 12_345_678, tokenLimit: 100_000_000 })).toBe('87.65')
    })

    it('clamps overspend to 0', () => {
      expect(getTokenRemaining({ tokenUsed: 150_000_000, tokenLimit: 100_000_000 })).toBe(0)
    })

    it('returns 0 when limit is 0', () => {
      expect(getTokenRemaining({ tokenUsed: 10, tokenLimit: 0 })).toBe(0)
      expect(getTokenRemaining({})).toBe(0)
    })
  })

  describe('getTokenRemainingPercent', () => {
    it('returns remaining percent of the limit', () => {
      expect(getTokenRemainingPercent({ tokenUsed: 25_000_000, tokenLimit: 100_000_000 })).toBe(75)
      expect(getTokenRemainingPercent({ tokenUsed: 0, tokenLimit: 100_000_000 })).toBe(100)
    })

    it('returns 0 for zero limit (no division by zero)', () => {
      expect(getTokenRemainingPercent({ tokenUsed: 1, tokenLimit: 0 })).toBe(0)
      expect(getTokenRemainingPercent({})).toBe(0)
    })

    it('clamps overspend remaining percent to 0', () => {
      expect(getTokenRemainingPercent({ tokenUsed: 200_000_000, tokenLimit: 100_000_000 })).toBe(0)
    })
  })

  describe('getBalanceYuanText', () => {
    // 1 yuan = 10M tokens (remaining)
    it('converts remaining megatokens to yuan text', () => {
      expect(getBalanceYuanText({ tokenUsed: 0, tokenLimit: 100_000_000 })).toBe('10')
      expect(getBalanceYuanText({ tokenUsed: 50_000_000, tokenLimit: 100_000_000 })).toBe('5')
    })

    it('formats fractional yuan without trailing zeros', () => {
      // remaining 33M -> 3.3 yuan
      expect(getBalanceYuanText({ tokenUsed: 67_000_000, tokenLimit: 100_000_000 })).toBe('3.3')
    })

    it('returns 0 when remaining is 0 (including overspend and zero limit)', () => {
      expect(getBalanceYuanText({ tokenUsed: 100_000_000, tokenLimit: 100_000_000 })).toBe('0')
      expect(getBalanceYuanText({ tokenUsed: 120_000_000, tokenLimit: 100_000_000 })).toBe('0')
      expect(getBalanceYuanText({ tokenLimit: 0 })).toBe('0')
    })
  })
})

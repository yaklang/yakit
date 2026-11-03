import { describe, expect, it } from 'vitest'
import type { AISession } from '../../../type/aiChat'
import { getChatTimestamp, normalizeTimestamp } from '../HistoryChatList'

describe('normalizeTimestamp / getChatTimestamp', () => {
  it('零值字符串归一化为 0', () => {
    expect(normalizeTimestamp('0')).toBe(0)
    expect(normalizeTimestamp(0)).toBe(0)
  })

  it('UpdatedAt 为零值字符串时回退 CreatedAt', () => {
    const session = {
      UpdatedAt: '0',
      CreatedAt: 1_700_000_000,
    } as unknown as AISession
    expect(getChatTimestamp(session)).toBe(1_700_000_000 * 1000)
  })
})

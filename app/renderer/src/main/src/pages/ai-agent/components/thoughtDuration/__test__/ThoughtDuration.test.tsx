import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ThoughtDuration, { clearThoughtDurationCache } from '../ThoughtDuration'

vi.mock('@/pages/ai-re-act/hooks/useCurrentSessionId', () => ({ default: () => 'session-1' }))
vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({
    t: (key: string, opts?: Record<string, number>) => {
      if (key === 'AIChatListItem.thoughtDuration') return `持续了 ${opts?.seconds} 秒`
      if (key === 'AIChatListItem.thoughtDurationMinutes') return `持续了 ${opts?.minutes} 分钟`
      if (key === 'AIChatListItem.thoughtDurationMinutesSeconds') {
        return `持续了 ${opts?.minutes} 分 ${opts?.seconds} 秒`
      }
      return key
    },
  }),
}))

beforeEach(() => {
  clearThoughtDurationCache()
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2024-01-01T00:00:00.000Z'))
})

afterEach(() => {
  cleanup()
  clearThoughtDurationCache()
  vi.clearAllTimers()
  vi.useRealTimers()
})

describe('ThoughtDuration 五秒可见边界', () => {
  it('第 1–4 秒不展示，第 5 秒起展示「持续了 x 秒」', async () => {
    render(<ThoughtDuration persistKey="thought-1" status="start" />)
    expect(screen.queryByText(/持续了/)).not.toBeInTheDocument()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000)
    })
    // 墙钟 3s → deriveSeconds=4，仍低于阈值
    expect(screen.queryByText(/持续了/)).not.toBeInTheDocument()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(999)
    })
    expect(screen.queryByText(/持续了/)).not.toBeInTheDocument()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1)
    })
    // 墙钟 4s → deriveSeconds=5，开始展示
    expect(screen.getByText('持续了 5 秒')).toBeInTheDocument()
  })

  it('未满 5 秒就结束时不展示时长', async () => {
    const { rerender } = render(<ThoughtDuration persistKey="thought-short" status="start" />)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000)
    })
    expect(screen.queryByText(/持续了/)).not.toBeInTheDocument()

    rerender(<ThoughtDuration persistKey="thought-short" status="end" />)
    expect(screen.queryByText(/持续了/)).not.toBeInTheDocument()
  })

  it('历史仅 end、未见过 start 时不展示', () => {
    render(<ThoughtDuration persistKey="thought-history" status="end" />)
    expect(screen.queryByText(/持续了/)).not.toBeInTheDocument()
  })
})

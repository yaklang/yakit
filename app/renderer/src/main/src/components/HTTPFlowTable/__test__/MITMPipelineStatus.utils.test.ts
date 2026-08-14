import { describe, expect, it } from 'vitest'
import {
  deriveMITMPipelineRates,
  formatMITMPipelineDuration,
  normalizeMITMPipelineStats,
} from '../MITMPipelineStatus.utils'

describe('MITMPipelineStatus utils', () => {
  it('normalizes proto-loader string longs and rejects invalid values', () => {
    const stats = normalizeMITMPipelineStats({
      SessionId: 'session-1',
      GeneratedAtUnixMs: '2000',
      RequestTotal: '12',
      UpstreamActive: -1,
      DatabaseWriteQueueDepth: 'invalid',
    })
    expect(stats.SessionId).toBe('session-1')
    expect(stats.GeneratedAtUnixMs).toBe(2000)
    expect(stats.RequestTotal).toBe(12)
    expect(stats.UpstreamActive).toBe(0)
    expect(stats.DatabaseWriteQueueDepth).toBe(0)
  })

  it('derives rates from monotonic counters in the same session', () => {
    const previous = normalizeMITMPipelineStats({
      SessionId: 'session-1',
      GeneratedAtUnixMs: 1000,
      RequestTotal: 10,
      DispatchTotal: 8,
      UpstreamCompletedTotal: 6,
      PersistedTotal: 4,
    })
    const current = normalizeMITMPipelineStats({
      SessionId: 'session-1',
      GeneratedAtUnixMs: 3000,
      RequestTotal: 30,
      DispatchTotal: 24,
      UpstreamCompletedTotal: 20,
      PersistedTotal: 16,
    })
    expect(deriveMITMPipelineRates(previous, current)).toMatchObject({
      request: 10,
      dispatch: 8,
      upstreamCompleted: 7,
      persisted: 6,
    })
  })

  it('resets rates across sessions and formats active age', () => {
    const previous = normalizeMITMPipelineStats({ SessionId: 'old', GeneratedAtUnixMs: 1000, RequestTotal: 10 })
    const current = normalizeMITMPipelineStats({ SessionId: 'new', GeneratedAtUnixMs: 2000, RequestTotal: 20 })
    expect(deriveMITMPipelineRates(previous, current).request).toBe(0)
    expect(formatMITMPipelineDuration(84)).toBe('84ms')
    expect(formatMITMPipelineDuration(2500)).toBe('2.5s')
  })
})

import { describe, it, expect, vi } from 'vitest'

vi.mock('@/utils/electronBridge', () => ({
  yakitEngine: {
    outputLogToWelcomeConsole: vi.fn().mockResolvedValue(undefined),
  },
  yakitSystem: {
    fetchSystemName: vi.fn(),
    fetchCpuArch: vi.fn(),
    isDev: vi.fn(),
  },
}))

import { safeFormatDownloadProcessState } from '../utils'

describe('safeFormatDownloadProcessState', () => {
  it('should format complete downloading state correctly', () => {
    const state = {
      percent: 50,
      size: {
        total: 1000,
        transferred: 500,
      },
      speed: 200,
      time: {
        elapsed: 10,
        remaining: 10,
      },
    }

    const result = safeFormatDownloadProcessState(state as any)

    expect(result).toEqual({
      percent: 50,
      size: {
        total: 1000,
        transferred: 500,
      },
      speed: 200,
      time: {
        elapsed: 10,
        remaining: 10,
      },
    })
  })

  it('should fallback to 0 when optional fields are missing', () => {
    const state = {
      percent: undefined,
      size: {},
      time: {},
    }

    const result = safeFormatDownloadProcessState(state as any)

    expect(result).toEqual({
      percent: 0,
      size: {
        total: 0,
        transferred: 0,
      },
      speed: 0,
      time: {
        elapsed: 0,
        remaining: 0,
      },
    })
  })

  it('should return safe default values when exception occurs', () => {
    const state = {
      get size() {
        throw new Error('boom')
      },
    }

    const result = safeFormatDownloadProcessState(state as any)

    expect(result).toEqual({
      percent: 0,
      size: {
        total: 0,
        transferred: 0,
      },
      speed: 0,
      time: {
        elapsed: 0,
        remaining: 0,
      },
    })
  })
})

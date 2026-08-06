import { describe, expect, it } from 'vitest'
import { normalizeBrowserTransformAdapterStatus } from '../browserTransformAdapter'

describe('browser transform external adapter boundary', () => {
  it('normalizes grpc long strings and rejects unsafe values', () => {
    expect(
      normalizeBrowserTransformAdapterStatus({
        Running: true,
        Endpoint: 'http://127.0.0.1:41000',
        Token: 'temporary-token',
        DeviceId: 'browser-1',
        ProfileId: 'profile-1',
        ProfileName: 'Login gateway',
        RequestEnabled: true,
        ResponseEnabled: false,
        StartedAt: '1785630000000',
        RequestCount: '12',
        BypassCount: '8',
        FailureCount: '2',
        LastUsedAt: '1785630000100',
        Port: 41000,
        TimeoutMilliseconds: '10000',
        ProtocolVersion: '1',
        Methods: ['POST', 7, 'PUT'],
        UrlPattern: 'https://example.test/api/*',
        Origin: 'https://example.test',
      }),
    ).toMatchObject({
      running: true,
      endpoint: 'http://127.0.0.1:41000',
      deviceId: 'browser-1',
      profileId: 'profile-1',
      startedAt: 1785630000000,
      requestCount: 12,
      bypassCount: 8,
      failureCount: 2,
      port: 41000,
      timeoutMilliseconds: 10000,
      methods: ['POST', 'PUT'],
      origin: 'https://example.test',
      urlPattern: 'https://example.test/api/*',
    })

    expect(
      normalizeBrowserTransformAdapterStatus({
        Running: 'true',
        RequestCount: '-1',
        BypassCount: '-2',
        FailureCount: '9007199254740992',
        Port: Number.NaN,
      }),
    ).toMatchObject({
      running: false,
      requestCount: 0,
      bypassCount: 0,
      failureCount: 0,
      port: 0,
    })
  })

  it('returns a safe stopped state for malformed renderer input', () => {
    const value = normalizeBrowserTransformAdapterStatus(null)
    expect(value.running).toBe(false)
    expect(value.endpoint).toBe('')
    expect(value.requestCount).toBe(0)
    expect(value.bypassCount).toBe(0)
  })
})

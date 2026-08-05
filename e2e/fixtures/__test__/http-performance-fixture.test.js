import { describe, expect, it } from 'vitest'
import {
  resolveMITMPerformanceProfile,
  runHTTPProxyLoad,
  startLoopbackHTTPPerformanceTarget,
  waitForLoopbackPort,
  waitForLoopbackPortClosed,
} from '../http-performance/http-performance-fixture.mjs'

describe('HTTP MITM performance fixture', () => {
  it('uses explicit bounded profiles and never falls back from an unknown name', () => {
    expect(resolveMITMPerformanceProfile('smoke')).toMatchObject({
      requests: 40,
      concurrency: 4,
      targetRequestsPerSecond: 0,
      requestBodyBytes: 0,
      responseBodyBytes: 32 * 1024,
      responseContentEncoding: 'identity',
    })
    expect(
      resolveMITMPerformanceProfile('standard', {
        requests: 120,
        concurrency: 8,
        targetRequestsPerSecond: 200,
        requestBodyBytes: 64 * 1024,
        responseBodyBytes: 256 * 1024,
        responseContentEncoding: 'gzip',
      }),
    ).toMatchObject({
      requests: 120,
      concurrency: 8,
      targetRequestsPerSecond: 200,
      requestBodyBytes: 64 * 1024,
      responseBodyBytes: 256 * 1024,
      responseContentEncoding: 'gzip',
    })
    expect(() => resolveMITMPerformanceProfile('standard', { requestBodyBytes: 17 * 1024 * 1024 })).toThrow(
      /requestBodyBytes/,
    )
    expect(() =>
      resolveMITMPerformanceProfile('stress', { requestBodyBytes: 1024 * 1024, responseBodyBytes: 1024 * 1024 }),
    ).toThrow(/safety limit/)
    expect(() => resolveMITMPerformanceProfile('large-by-accident')).toThrow(/Unknown MITM performance profile/)
    expect(() => resolveMITMPerformanceProfile('stress', { targetRequestsPerSecond: 5_001 })).toThrow(
      /targetRequestsPerSecond/,
    )
    expect(() => resolveMITMPerformanceProfile('standard', { responseContentEncoding: 'br' })).toThrow(
      /responseContentEncoding/,
    )
  })

  it('serves gzip wire bytes while retaining the decoded body contract', async () => {
    const target = await startLoopbackHTTPPerformanceTarget({
      token: 'gzip-fixture-test',
      bodyBytes: 256 * 1024,
      responseContentEncoding: 'gzip',
    })
    try {
      const result = await runHTTPProxyLoad({
        proxyPort: target.port,
        targetBaseURL: target.baseURL,
        token: target.token,
        requests: 4,
        concurrency: 2,
        requestBodyBytes: 0,
        responseContentEncoding: 'gzip',
        requestTimeoutMs: 2_000,
      })

      expect(result).toMatchObject({ completed: 4, failed: 0 })
      expect(target.responseBodyBytes).toBe(256 * 1024)
      expect(target.wireResponseBodyBytes).toBeLessThan(target.responseBodyBytes)
      expect(result.responseBytes).toBe(4 * target.wireResponseBodyBytes)
      expect(target.snapshot()).toMatchObject({
        responseBodyBytes: 256 * 1024,
        wireResponseBodyBytes: target.wireResponseBodyBytes,
        responseContentEncoding: 'gzip',
      })
    } finally {
      await target.stop()
    }
  })

  it('produces unique absolute-form HTTP requests with bounded concurrency', async () => {
    const target = await startLoopbackHTTPPerformanceTarget({
      token: 'fixture-test',
      bodyBytes: 1024,
      requestBodyBytes: 2048,
    })
    try {
      await waitForLoopbackPort({ port: target.port, timeoutMs: 2_000 })
      const result = await runHTTPProxyLoad({
        proxyPort: target.port,
        targetBaseURL: target.baseURL,
        token: target.token,
        requests: 12,
        concurrency: 3,
        requestBodyBytes: 2048,
        requestTimeoutMs: 2_000,
      })

      expect(result).toMatchObject({ requests: 12, concurrency: 3, completed: 12, failed: 0 })
      expect(result.latencyMs.count).toBe(12)
      expect(result.responseBytes).toBe(12 * 1024)
      expect(result.requestBytes).toBe(12 * 2048)
      expect(target.progress()).toMatchObject({
        receivedRequests: 12,
        receivedRequestBodyBytes: 12 * 2048,
      })
      expect(target.snapshot()).toMatchObject({
        receivedRequests: 12,
        uniqueSequences: 12,
        sequences: Array.from({ length: 12 }, (_, index) => index + 1),
        duplicateSequences: [],
        receivedRequestBodyBytes: 12 * 2048,
      })
    } finally {
      await target.stop()
    }
    await waitForLoopbackPortClosed({ port: target.port, timeoutMs: 2_000 })
  })

  it('paces request dispatch at a fixed target rate without weakening the concurrency bound', async () => {
    const target = await startLoopbackHTTPPerformanceTarget({
      token: 'fixed-rate-fixture-test',
      bodyBytes: 256,
      requestBodyBytes: 0,
    })
    try {
      const result = await runHTTPProxyLoad({
        proxyPort: target.port,
        targetBaseURL: target.baseURL,
        token: target.token,
        requests: 10,
        concurrency: 4,
        targetRequestsPerSecond: 50,
        requestTimeoutMs: 2_000,
      })

      expect(result).toMatchObject({
        requests: 10,
        concurrency: 4,
        targetRequestsPerSecond: 50,
        completed: 10,
        failed: 0,
      })
      expect(result.durationMs).toBeGreaterThanOrEqual(170)
      expect(result.dispatchRequestsPerSecond).toBeGreaterThan(40)
      expect(result.dispatchRequestsPerSecond).toBeLessThan(65)
      expect(result.scheduleLagMs.count).toBe(10)
      expect(result.scheduleLagMs.p95).toBeLessThan(50)
    } finally {
      await target.stop()
    }
  })
})

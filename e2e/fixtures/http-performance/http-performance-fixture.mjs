import { randomUUID } from 'node:crypto'
import http from 'node:http'
import net from 'node:net'
import { performance } from 'node:perf_hooks'
import { gzipSync } from 'node:zlib'

const PROFILE_CONFIGS = Object.freeze({
  smoke: Object.freeze({
    name: 'smoke',
    requests: 40,
    concurrency: 4,
    targetRequestsPerSecond: 0,
    requestBodyBytes: 0,
    responseBodyBytes: 32 * 1024,
    responseContentEncoding: 'identity',
    requestTimeoutMs: 10_000,
    scenarioTimeoutMs: 60_000,
  }),
  standard: Object.freeze({
    name: 'standard',
    requests: 200,
    concurrency: 8,
    targetRequestsPerSecond: 0,
    requestBodyBytes: 0,
    responseBodyBytes: 64 * 1024,
    responseContentEncoding: 'identity',
    requestTimeoutMs: 15_000,
    scenarioTimeoutMs: 120_000,
  }),
  stress: Object.freeze({
    name: 'stress',
    requests: 1_000,
    concurrency: 16,
    targetRequestsPerSecond: 0,
    requestBodyBytes: 0,
    responseBodyBytes: 64 * 1024,
    responseContentEncoding: 'identity',
    requestTimeoutMs: 20_000,
    scenarioTimeoutMs: 300_000,
  }),
})

const PROFILE_OVERRIDE_LIMITS = Object.freeze({
  requests: Object.freeze({ minimum: 1, maximum: 1_000 }),
  concurrency: Object.freeze({ minimum: 1, maximum: 32 }),
  targetRequestsPerSecond: Object.freeze({ minimum: 0, maximum: 5_000 }),
  requestBodyBytes: Object.freeze({ minimum: 0, maximum: 16 * 1024 * 1024 }),
  responseBodyBytes: Object.freeze({ minimum: 0, maximum: 5 * 1024 * 1024 }),
})
const MAX_PROFILE_TRANSFER_BYTES = 512 * 1024 * 1024
const RESPONSE_CONTENT_ENCODINGS = new Set(['identity', 'gzip'])

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds))

const listen = (server, port = 0) =>
  new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(port, '127.0.0.1', () => {
      server.off('error', reject)
      resolve()
    })
  })

const closeServer = (server) =>
  new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) reject(error)
      else resolve()
    })
    server.closeAllConnections?.()
  })

const distribution = (values) => {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b)
  if (!sorted.length) return { count: 0 }
  const at = (ratio) => sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * ratio) - 1))]
  return {
    count: sorted.length,
    min: sorted[0],
    p50: at(0.5),
    p95: at(0.95),
    p99: at(0.99),
    max: sorted[sorted.length - 1],
  }
}

const makeResponseBody = (size) => {
  const prefix = Buffer.from('{"status":"ok","payload":"')
  const suffix = Buffer.from('"}')
  if (size < prefix.length + suffix.length) return Buffer.alloc(size, 0x61)
  return Buffer.concat([prefix, Buffer.alloc(size - prefix.length - suffix.length, 0x61), suffix])
}

const makeRequestBody = (size) => Buffer.alloc(size, 0x72)

export const resolveMITMPerformanceProfile = (name = 'smoke', overrides = {}) => {
  const profile = PROFILE_CONFIGS[name]
  if (!profile) {
    throw new Error(`Unknown MITM performance profile ${JSON.stringify(name)}; expected smoke, standard, or stress`)
  }
  const resolved = { ...profile }
  for (const [field, limits] of Object.entries(PROFILE_OVERRIDE_LIMITS)) {
    const value = overrides[field]
    if (value === undefined) continue
    if (!Number.isInteger(value) || value < limits.minimum || value > limits.maximum) {
      throw new Error(`${field} must be an integer between ${limits.minimum} and ${limits.maximum}: ${value}`)
    }
    resolved[field] = value
  }
  if (overrides.responseContentEncoding !== undefined) {
    if (!RESPONSE_CONTENT_ENCODINGS.has(overrides.responseContentEncoding)) {
      throw new Error(`responseContentEncoding must be identity or gzip: ${overrides.responseContentEncoding}`)
    }
    resolved.responseContentEncoding = overrides.responseContentEncoding
  }
  if (resolved.concurrency > resolved.requests) resolved.concurrency = resolved.requests
  const transferBytes = resolved.requests * (resolved.requestBodyBytes + resolved.responseBodyBytes)
  if (transferBytes > MAX_PROFILE_TRANSFER_BYTES) {
    throw new Error(
      `MITM performance profile transfers ${transferBytes} bytes, exceeding the ${MAX_PROFILE_TRANSFER_BYTES} byte safety limit`,
    )
  }
  return resolved
}

export const reserveLoopbackPort = async () => {
  const reservation = net.createServer()
  await listen(reservation)
  const address = reservation.address()
  if (!address || typeof address === 'string') {
    await closeServer(reservation)
    throw new Error('Cannot resolve reserved loopback port')
  }
  await closeServer(reservation)
  return address.port
}

export const waitForLoopbackPort = async ({ port, timeoutMs = 30_000, signal }) => {
  const expiresAt = Date.now() + timeoutMs
  let lastError
  while (Date.now() < expiresAt) {
    if (signal?.aborted) throw new Error(`Waiting for 127.0.0.1:${port} was interrupted`)
    try {
      await new Promise((resolve, reject) => {
        const socket = net.connect({ host: '127.0.0.1', port })
        socket.setTimeout(1_000)
        socket.once('connect', () => {
          socket.end()
          resolve()
        })
        socket.once('timeout', () => socket.destroy(new Error('connect timeout')))
        socket.once('error', reject)
      })
      return
    } catch (error) {
      lastError = error
      await delay(100)
    }
  }
  throw new Error(`127.0.0.1:${port} did not accept connections within ${timeoutMs}ms: ${lastError || 'unknown'}`)
}

export const waitForLoopbackPortClosed = async ({ port, timeoutMs = 10_000 }) => {
  const expiresAt = Date.now() + timeoutMs
  while (Date.now() < expiresAt) {
    try {
      await waitForLoopbackPort({ port, timeoutMs: 500 })
    } catch {
      return
    }
    await delay(100)
  }
  throw new Error(`127.0.0.1:${port} still accepts connections after ${timeoutMs}ms`)
}

export const startLoopbackHTTPPerformanceTarget = async ({
  token = randomUUID(),
  bodyBytes = 32 * 1024,
  requestBodyBytes = 0,
  responseContentEncoding = 'identity',
} = {}) => {
  const responseBody = makeResponseBody(bodyBytes)
  if (!RESPONSE_CONTENT_ENCODINGS.has(responseContentEncoding)) {
    throw new Error(`Unsupported response content encoding: ${responseContentEncoding}`)
  }
  const wireResponseBody = responseContentEncoding === 'gzip' ? gzipSync(responseBody) : responseBody
  const sequenceCounts = new Map()
  let receivedRequests = 0
  let receivedBytes = 0
  let firstRequestAtUnixMs = 0
  let lastRequestAtUnixMs = 0

  const server = http.createServer(async (request, response) => {
    try {
      let actualRequestBodyBytes = 0
      for await (const chunk of request) actualRequestBodyBytes += chunk.length

      const requestURL = new URL(request.url || '/', 'http://127.0.0.1')
      const prefix = `/__yakit_e2e__/${token}/`
      const expectedMethod = requestBodyBytes > 0 ? 'POST' : 'GET'
      if (request.method !== expectedMethod || !requestURL.pathname.startsWith(prefix)) {
        response.writeHead(404, { Connection: 'close' })
        response.end('not found')
        return
      }

      const sequence = Number(requestURL.pathname.slice(prefix.length))
      if (!Number.isInteger(sequence) || sequence < 1) {
        response.writeHead(400, { Connection: 'close' })
        response.end('invalid sequence')
        return
      }
      if (actualRequestBodyBytes !== requestBodyBytes) {
        response.writeHead(400, { Connection: 'close' })
        response.end(`invalid request body size ${actualRequestBodyBytes}`)
        return
      }

      const now = Date.now()
      firstRequestAtUnixMs ||= now
      lastRequestAtUnixMs = now
      sequenceCounts.set(sequence, (sequenceCounts.get(sequence) || 0) + 1)
      receivedRequests += 1
      receivedBytes += actualRequestBodyBytes

      response.writeHead(200, {
        'Content-Type': 'application/json',
        'Content-Length': wireResponseBody.length,
        ...(responseContentEncoding === 'identity' ? {} : { 'Content-Encoding': responseContentEncoding }),
        'X-Yakit-E2E-Scenario': token,
        'X-Yakit-E2E-Sequence': String(sequence),
        Connection: 'close',
      })
      response.end(wireResponseBody)
    } catch (error) {
      response.writeHead(500, { Connection: 'close' })
      response.end(error?.message || String(error))
    }
  })

  await listen(server)
  const address = server.address()
  if (!address || typeof address === 'string') {
    await closeServer(server)
    throw new Error('Cannot resolve loopback HTTP target address')
  }

  return {
    token,
    port: address.port,
    origin: `http://127.0.0.1:${address.port}`,
    baseURL: `http://127.0.0.1:${address.port}/__yakit_e2e__/${token}`,
    responseBodyBytes: responseBody.length,
    wireResponseBodyBytes: wireResponseBody.length,
    responseContentEncoding,
    progress: () => ({
      receivedRequests,
      receivedRequestBodyBytes: receivedBytes,
      firstRequestAtUnixMs,
      lastRequestAtUnixMs,
    }),
    snapshot: () => {
      const sequences = [...sequenceCounts.keys()].sort((a, b) => a - b)
      return {
        token,
        receivedRequests,
        uniqueSequences: sequences.length,
        sequences,
        duplicateSequences: sequences.filter((sequence) => sequenceCounts.get(sequence) > 1),
        receivedRequestBodyBytes: receivedBytes,
        responseBodyBytes: responseBody.length,
        wireResponseBodyBytes: wireResponseBody.length,
        responseContentEncoding,
        firstRequestAtUnixMs,
        lastRequestAtUnixMs,
      }
    },
    stop: () => closeServer(server),
  }
}

const sendProxyRequest = ({
  proxyHost,
  proxyPort,
  targetURL,
  token,
  sequence,
  timeoutMs,
  requestBody,
  responseContentEncoding,
}) =>
  new Promise((resolve) => {
    const startedAt = performance.now()
    const target = new URL(targetURL)
    const request = http.request(
      {
        host: proxyHost,
        port: proxyPort,
        method: requestBody.length > 0 ? 'POST' : 'GET',
        path: target.href,
        agent: false,
        headers: {
          Host: target.host,
          Accept: 'application/json',
          'X-Yakit-E2E-Scenario': token,
          'X-Yakit-E2E-Sequence': String(sequence),
          'Content-Length': String(requestBody.length),
          ...(requestBody.length > 0 ? { 'Content-Type': 'application/octet-stream' } : {}),
          Connection: 'close',
        },
      },
      (response) => {
        let responseBytes = 0
        response.on('data', (chunk) => {
          responseBytes += chunk.length
        })
        response.once('end', () => {
          const statusCode = response.statusCode || 0
          const responseToken = response.headers['x-yakit-e2e-scenario']
          const responseSequence = Number(response.headers['x-yakit-e2e-sequence'])
          const actualContentEncoding = String(response.headers['content-encoding'] || 'identity').toLowerCase()
          const error =
            statusCode !== 200
              ? `unexpected status ${statusCode}`
              : responseToken !== token
                ? `unexpected scenario header ${responseToken}`
                : responseSequence !== sequence
                  ? `unexpected sequence header ${responseSequence}`
                  : actualContentEncoding !== responseContentEncoding
                    ? `unexpected content encoding ${actualContentEncoding}`
                    : undefined
          resolve({
            sequence,
            statusCode,
            responseBytes,
            latencyMs: performance.now() - startedAt,
            error,
          })
        })
        response.once('error', (error) => {
          resolve({ sequence, latencyMs: performance.now() - startedAt, responseBytes, error: error.message })
        })
      },
    )
    request.setTimeout(timeoutMs, () => request.destroy(new Error(`request timeout after ${timeoutMs}ms`)))
    request.once('error', (error) => {
      resolve({ sequence, latencyMs: performance.now() - startedAt, responseBytes: 0, error: error.message })
    })
    request.end(requestBody)
  })

export const runHTTPProxyLoad = async ({
  proxyHost = '127.0.0.1',
  proxyPort,
  targetBaseURL,
  token,
  requests,
  concurrency,
  targetRequestsPerSecond = 0,
  requestBodyBytes = 0,
  responseContentEncoding = 'identity',
  requestTimeoutMs,
}) => {
  if (!Number.isInteger(proxyPort) || proxyPort < 1 || proxyPort > 65_535) {
    throw new Error(`Invalid HTTP proxy port: ${proxyPort}`)
  }
  if (!Number.isInteger(requests) || requests < 1 || !Number.isInteger(concurrency) || concurrency < 1) {
    throw new Error(`Invalid load shape: requests=${requests}, concurrency=${concurrency}`)
  }
  if (!Number.isInteger(requestBodyBytes) || requestBodyBytes < 0) {
    throw new Error(`Invalid request body size: ${requestBodyBytes}`)
  }
  if (!RESPONSE_CONTENT_ENCODINGS.has(responseContentEncoding)) {
    throw new Error(`Unsupported response content encoding: ${responseContentEncoding}`)
  }
  if (!Number.isInteger(targetRequestsPerSecond) || targetRequestsPerSecond < 0 || targetRequestsPerSecond > 5_000) {
    throw new Error(`Invalid target request rate: ${targetRequestsPerSecond}`)
  }

  const requestBody = makeRequestBody(requestBodyBytes)
  const startedAtUnixMs = Date.now()
  const startedAt = performance.now()
  const results = new Array(requests)
  let nextSequence = 1
  const runSequence = async (sequence, scheduledAt) => {
    if (scheduledAt !== undefined) {
      const waitMs = scheduledAt - performance.now()
      if (waitMs > 0) await delay(waitMs)
    }
    const dispatchedAt = performance.now()
    const result = await sendProxyRequest({
      proxyHost,
      proxyPort,
      targetURL: `${targetBaseURL}/${sequence}`,
      token,
      sequence,
      timeoutMs: requestTimeoutMs,
      requestBody,
      responseContentEncoding,
    })
    results[sequence - 1] = {
      ...result,
      dispatchOffsetMs: dispatchedAt - startedAt,
      ...(scheduledAt === undefined ? {} : { scheduleLagMs: Math.max(0, dispatchedAt - scheduledAt) }),
    }
  }
  const worker = async () => {
    while (nextSequence <= requests) {
      const sequence = nextSequence
      nextSequence += 1
      await runSequence(sequence)
    }
  }
  if (targetRequestsPerSecond > 0) {
    const intervalMs = 1_000 / targetRequestsPerSecond
    const inFlight = new Set()
    for (let sequence = 1; sequence <= requests; sequence += 1) {
      const scheduledAt = startedAt + (sequence - 1) * intervalMs
      const waitMs = scheduledAt - performance.now()
      if (waitMs > 0) await delay(waitMs)
      while (inFlight.size >= concurrency) await Promise.race(inFlight)
      const pending = runSequence(sequence, scheduledAt).finally(() => inFlight.delete(pending))
      inFlight.add(pending)
    }
    await Promise.all(inFlight)
  } else {
    await Promise.all(Array.from({ length: Math.min(concurrency, requests) }, worker))
  }

  const durationMs = performance.now() - startedAt
  const errors = results.filter((result) => result.error)
  const completed = results.length - errors.length
  const dispatchOffsets = results.map((result) => result.dispatchOffsetMs).filter(Number.isFinite)
  const dispatchSpanMs =
    dispatchOffsets.length > 1 ? Math.max(...dispatchOffsets) - Math.min(...dispatchOffsets) : undefined
  return {
    startedAtUnixMs,
    finishedAtUnixMs: Date.now(),
    durationMs,
    requests,
    concurrency,
    targetRequestsPerSecond,
    completed,
    failed: errors.length,
    requestsPerSecond: durationMs > 0 ? (completed * 1000) / durationMs : 0,
    dispatchRequestsPerSecond:
      dispatchSpanMs > 0 && dispatchOffsets.length > 1
        ? ((dispatchOffsets.length - 1) * 1000) / dispatchSpanMs
        : undefined,
    scheduleLagMs: distribution(results.map((result) => result.scheduleLagMs)),
    responseBytes: results.reduce((sum, result) => sum + result.responseBytes, 0),
    requestBytes: completed * requestBody.length,
    latencyMs: distribution(results.map((result) => result.latencyMs)),
    errors: errors.map(({ sequence, error }) => ({ sequence, error })),
  }
}

export const startHTTPPerformanceFixture = async ({ profileName = 'smoke', profileOverrides } = {}) => {
  const profile = resolveMITMPerformanceProfile(profileName, profileOverrides)
  const token = `mitm-http-${randomUUID().replaceAll('-', '')}`
  const target = await startLoopbackHTTPPerformanceTarget({
    token,
    bodyBytes: profile.responseBodyBytes,
    requestBodyBytes: profile.requestBodyBytes,
    responseContentEncoding: profile.responseContentEncoding,
  })
  const proxyPort = await reserveLoopbackPort()
  return {
    profile,
    token,
    proxyHost: '127.0.0.1',
    proxyPort,
    target,
    runLoad: () =>
      runHTTPProxyLoad({
        proxyHost: '127.0.0.1',
        proxyPort,
        targetBaseURL: target.baseURL,
        token,
        requests: profile.requests,
        concurrency: profile.concurrency,
        targetRequestsPerSecond: profile.targetRequestsPerSecond,
        requestBodyBytes: profile.requestBodyBytes,
        responseContentEncoding: profile.responseContentEncoding,
        requestTimeoutMs: profile.requestTimeoutMs,
      }),
    stop: () => target.stop(),
  }
}

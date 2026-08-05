import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

export const MAX_YAK_PPROF_ARTIFACT_BYTES = 64 * 1024 * 1024

const resolveLoopbackPProfEndpoint = ({ address, profile }) => {
  const match = /^127\.0\.0\.1:(\d+)$/.exec(String(address || ''))
  const port = Number(match?.[1])
  if (!match || !Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error(`Yak pprof endpoint must be a valid loopback address: ${address}`)
  }
  if (!['profile', 'heap'].includes(profile)) {
    throw new Error(`Unsupported Yak pprof profile: ${profile}`)
  }
  return new URL(`http://${address}/debug/pprof/${profile}`)
}

export const collectYakPProfArtifact = async ({
  address,
  profile,
  query,
  outputPath,
  maxBytes = MAX_YAK_PPROF_ARTIFACT_BYTES,
  timeoutMs,
  signal,
  label = 'Yak pprof profile',
}) => {
  if (!path.isAbsolute(outputPath)) throw new Error(`${label} output must be absolute: ${outputPath}`)
  if (!Number.isInteger(maxBytes) || maxBytes < 1 || maxBytes > MAX_YAK_PPROF_ARTIFACT_BYTES) {
    throw new Error(`${label} byte limit must be between 1 and ${MAX_YAK_PPROF_ARTIFACT_BYTES}: ${maxBytes}`)
  }
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1_000 || timeoutMs > 120_000) {
    throw new Error(`${label} timeout must be between 1000 and 120000 milliseconds: ${timeoutMs}`)
  }

  const endpoint = resolveLoopbackPProfEndpoint({ address, profile })
  for (const [name, value] of Object.entries(query || {})) endpoint.searchParams.set(name, String(value))

  const timeoutController = new AbortController()
  const timeout = setTimeout(() => timeoutController.abort(), timeoutMs)
  const abort = () => timeoutController.abort()
  if (signal?.aborted) abort()
  else signal?.addEventListener('abort', abort, { once: true })
  const startedAt = new Date()

  try {
    const response = await fetch(endpoint, { signal: timeoutController.signal })
    if (!response.ok) throw new Error(`${label} endpoint returned HTTP ${response.status}`)
    const declaredBytes = Number(response.headers.get('content-length'))
    if (Number.isFinite(declaredBytes) && declaredBytes > maxBytes) {
      throw new Error(`${label} exceeds ${maxBytes} bytes: ${declaredBytes}`)
    }
    if (!response.body) throw new Error(`${label} response has no body`)

    const reader = response.body.getReader()
    const chunks = []
    let receivedBytes = 0
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      receivedBytes += value.byteLength
      if (receivedBytes > maxBytes) {
        await reader.cancel()
        throw new Error(`${label} exceeds ${maxBytes} bytes: more than ${receivedBytes}`)
      }
      chunks.push(Buffer.from(value))
    }
    if (!receivedBytes) throw new Error(`${label} is empty`)

    await mkdir(path.dirname(outputPath), { recursive: true })
    await writeFile(outputPath, Buffer.concat(chunks, receivedBytes))
    return {
      startedAt: startedAt.toISOString(),
      finishedAt: new Date().toISOString(),
      bytes: receivedBytes,
      artifactFile: path.basename(outputPath),
    }
  } catch (error) {
    if (timeoutController.signal.aborted) {
      throw new Error(`${label} collection was interrupted or timed out: ${error.message}`)
    }
    throw error
  } finally {
    clearTimeout(timeout)
    signal?.removeEventListener('abort', abort)
  }
}

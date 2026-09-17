import fs from 'node:fs'
import type { ClientWritableStream } from '@grpc/grpc-js'
import type {
  YakClient,
  UploadToTemporaryFileRequest,
  UploadToTemporaryFileResponse__Output,
} from '../../shared/generated/grpc/types'
type UploadStream = ClientWritableStream<UploadToTemporaryFileRequest>

const DEFAULT_UPLOAD_CHUNK_SIZE = 1024 * 1024
/** stream.end() 之后若引擎不回调，前端 modal 会一直 loading；默认 60s 兜底失败。 */
const DEFAULT_UPLOAD_RESPONSE_TIMEOUT_MS = 60 * 1000

const writeUploadChunk = (stream: UploadStream, data: Uint8Array, timeoutMs: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    let settled = false
    let timer: ReturnType<typeof setTimeout> | undefined
    const done = (error?: unknown) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      stream.removeListener('error', done)
      signal?.removeEventListener('abort', abort)
      if (error) reject(error)
      else resolve()
    }
    const abort = () => done(Object.assign(new Error('Upload aborted'), { code: 'ABORTED' }))
    if (signal?.aborted) {
      abort()
      return
    }
    signal?.addEventListener('abort', abort, { once: true })
    stream.once('error', done)
    timer = setTimeout(() => done(new Error('UploadToTemporaryFile timed out writing a chunk')), timeoutMs)
    try {
      stream.write({ Data: data }, done)
    } catch (error) {
      done(error)
    }
  })

/** 给引擎完成回调加截止时间；超时先 cancel 流，再把超时错误抛给调用方。 */
const withTimeout = <T>(promise: Promise<T>, timeoutMs: number, onTimeout: () => void) =>
  new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      try {
        onTimeout?.()
      } catch (_) {}
      reject(new Error('UploadToTemporaryFile timed out waiting for engine response'))
    }, timeoutMs)
    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (error) => {
        clearTimeout(timer)
        reject(error)
      },
    )
  })

/**
 * Upload a GUI-local file to the currently connected Yak engine. The returned
 * FileName is an engine path and is therefore safe to embed in a file
 * Fuzztags in both local and remote-engine modes.
 *
 * @param {number} [responseTimeoutMs] 等待引擎返回临时路径的超时（毫秒），超时会 cancel 上传流。
 */
const uploadLocalFileToEngine = async (
  getClient: () => Pick<YakClient, 'UploadToTemporaryFile'>,
  filePath: string,
  chunkSize = DEFAULT_UPLOAD_CHUNK_SIZE,
  responseTimeoutMs = DEFAULT_UPLOAD_RESPONSE_TIMEOUT_MS,
  signal?: AbortSignal,
) => {
  if (!filePath || !Number.isSafeInteger(chunkSize) || chunkSize <= 0) {
    throw new Error('invalid temporary file upload parameters')
  }
  if (!Number.isSafeInteger(responseTimeoutMs) || responseTimeoutMs <= 0) {
    throw new Error('invalid temporary file upload timeout')
  }
  const stat = await fs.promises.stat(filePath)
  if (!stat.isFile()) {
    throw new Error('temporary file upload path is not a file')
  }
  if (signal?.aborted) throw Object.assign(new Error('Upload aborted'), { code: 'ABORTED' })

  let stream!: UploadStream
  let rejectResponse!: (error: unknown) => void
  let cancelled = false
  const cancel = () => {
    if (!cancelled) {
      cancelled = true
      stream.cancel()
    }
  }
  const abort = () => {
    cancel()
    rejectResponse(Object.assign(new Error('Upload aborted'), { code: 'ABORTED' }))
  }
  const response = new Promise<UploadToTemporaryFileResponse__Output>((resolve, reject) => {
    rejectResponse = reject
    stream = getClient().UploadToTemporaryFile((error, data) => {
      if (error) {
        reject(error)
        return
      }
      if (!data) {
        reject(new Error('Yak engine did not return a temporary file response'))
        return
      }
      resolve(data)
    })
    stream.once('error', reject)
  })
  // The engine may reject while a file chunk is still being read or written.
  void response.catch(() => {})
  signal?.addEventListener('abort', abort, { once: true })
  if (signal?.aborted) abort()

  try {
    const fileStream = fs.createReadStream(filePath, { highWaterMark: chunkSize, signal })
    for await (const data of fileStream) {
      await writeUploadChunk(stream, data, responseTimeoutMs, signal)
    }
    stream.end()
    // 分块写完后仍须等引擎返回 FileName；无超时会导致 Fuzzer 替换弹窗永久 loading
    const result = await withTimeout(response, responseTimeoutMs, cancel)
    if (!result?.FileName) {
      throw new Error('Yak engine did not return a temporary file path')
    }
    return result
  } catch (error) {
    cancel()
    // 超时/写失败路径已 reject response，吞掉避免二次 unhandled rejection
    void response.catch(() => {})
    throw error
  } finally {
    signal?.removeEventListener('abort', abort)
  }
}

export { DEFAULT_UPLOAD_CHUNK_SIZE, DEFAULT_UPLOAD_RESPONSE_TIMEOUT_MS, uploadLocalFileToEngine }

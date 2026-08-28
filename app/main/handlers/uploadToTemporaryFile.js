const fs = require('fs')

const DEFAULT_UPLOAD_CHUNK_SIZE = 1024 * 1024
/** stream.end() 之后若引擎不回调，前端 modal 会一直 loading；默认 60s 兜底失败。 */
const DEFAULT_UPLOAD_RESPONSE_TIMEOUT_MS = 60 * 1000

const writeUploadChunk = (stream, data) =>
  new Promise((resolve, reject) => {
    try {
      stream.write({ Data: data }, (error) => {
        if (error) {
          reject(error)
          return
        }
        resolve()
      })
    } catch (error) {
      reject(error)
    }
  })

/** 给引擎完成回调加截止时间；超时先 cancel 流，再把超时错误抛给调用方。 */
const withTimeout = (promise, timeoutMs, onTimeout) =>
  new Promise((resolve, reject) => {
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
  getClient,
  filePath,
  chunkSize = DEFAULT_UPLOAD_CHUNK_SIZE,
  responseTimeoutMs = DEFAULT_UPLOAD_RESPONSE_TIMEOUT_MS,
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

  let stream
  const response = new Promise((resolve, reject) => {
    stream = getClient().UploadToTemporaryFile((error, data) => {
      if (error) {
        reject(error)
        return
      }
      resolve(data)
    })
    stream.once?.('error', reject)
  })

  try {
    const fileStream = fs.createReadStream(filePath, { highWaterMark: chunkSize })
    for await (const data of fileStream) {
      await writeUploadChunk(stream, data)
    }
    stream.end()
    // 分块写完后仍须等引擎返回 FileName；无超时会导致 Fuzzer 替换弹窗永久 loading
    const result = await withTimeout(response, responseTimeoutMs, () => stream?.cancel?.())
    if (!result?.FileName) {
      throw new Error('Yak engine did not return a temporary file path')
    }
    return result
  } catch (error) {
    stream?.cancel?.()
    // 超时/写失败路径已 reject response，吞掉避免二次 unhandled rejection
    void response.catch(() => {})
    throw error
  }
}

module.exports = {
  DEFAULT_UPLOAD_CHUNK_SIZE,
  DEFAULT_UPLOAD_RESPONSE_TIMEOUT_MS,
  uploadLocalFileToEngine,
}

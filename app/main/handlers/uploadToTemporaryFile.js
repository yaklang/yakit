const fs = require('fs')

const DEFAULT_UPLOAD_CHUNK_SIZE = 1024 * 1024

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

/**
 * Upload a GUI-local file to the currently connected Yak engine. The returned
 * FileName is an engine path and is therefore safe to embed in a file
 * Fuzztags in both local and remote-engine modes.
 */
const uploadLocalFileToEngine = async (getClient, filePath, chunkSize = DEFAULT_UPLOAD_CHUNK_SIZE) => {
  if (!filePath || !Number.isSafeInteger(chunkSize) || chunkSize <= 0) {
    throw new Error('invalid temporary file upload parameters')
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
    const result = await response
    if (!result?.FileName) {
      throw new Error('Yak engine did not return a temporary file path')
    }
    return result
  } catch (error) {
    stream?.cancel?.()
    void response.catch(() => {})
    throw error
  }
}

module.exports = {
  DEFAULT_UPLOAD_CHUNK_SIZE,
  uploadLocalFileToEngine,
}

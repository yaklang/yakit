const fs = require('fs')
const path = require('path')

const DEFAULT_MITMV2_REPLACEMENT_CHUNK_SIZE = 1024 * 1024

/**
 * Stream one GUI-local replacement file through the active MITMv2 control
 * stream. Unlike UploadToTemporaryFile, this protocol also binds the bytes to
 * one intercepted TaskID and either the whole body or one multipart PartIndex.
 */
const uploadMITMV2ReplacementFile = async (
  sendMessageAndWait,
  params,
  chunkSize = DEFAULT_MITMV2_REPLACEMENT_CHUNK_SIZE,
) => {
  if (typeof sendMessageAndWait !== 'function' || !Number.isSafeInteger(chunkSize) || chunkSize <= 0) {
    throw new Error('invalid MITM replacement upload parameters')
  }

  const { TaskID, ReplaceBody, PartIndex, FilePath } = params || {}
  const replaceBody = ReplaceBody === true
  if (!TaskID || (!replaceBody && (!Number.isInteger(PartIndex) || PartIndex < 0)) || !FilePath) {
    throw new Error('invalid large request replacement parameters')
  }

  const stat = await fs.promises.stat(FilePath)
  if (!stat.isFile()) {
    throw new Error('large request replacement path is not a file')
  }

  const filename = path.basename(FilePath)
  let started = false
  const sendChunk = async ({ Data = Buffer.alloc(0), Start = false, EOF = false, Cancel = false }) => {
    await sendMessageAndWait({
      ManualHijackControl: true,
      ManualHijackMessage: {
        TaskID,
        IsLargeRequestFileChunk: true,
        LargeRequestPartIndex: replaceBody ? 0 : PartIndex,
        LargeRequestFileData: Data,
        LargeRequestFileStart: Start,
        LargeRequestFileEOF: EOF,
        LargeRequestFileCancel: Cancel,
        LargeRequestReplaceBody: replaceBody,
      },
    })
  }
  const sendFileChunk = async ({ Data = Buffer.alloc(0), EOF = false }) => {
    const Start = !started
    // Mark the upload as started before awaiting the write so a partial
    // first-chunk failure still sends a best-effort cancel to the engine.
    started = true
    await sendChunk({ Data, Start, EOF })
  }

  try {
    const fileStream = fs.createReadStream(FilePath, { highWaterMark: chunkSize })
    for await (const data of fileStream) {
      await sendFileChunk({ Data: data })
    }
    // Empty files still need one Start+EOF control frame so the engine creates
    // a completed zero-byte replacement.
    await sendFileChunk({ EOF: true })
    return { Filename: filename, Size: stat.size }
  } catch (error) {
    if (started) {
      try {
        await sendChunk({ Cancel: true })
      } catch (_) {}
    }
    throw error
  }
}

/**
 * Serialize replacement uploads on the shared MITMv2 stream. Normal manual
 * hijack messages call waitForIdle(), preventing SendPacket from overtaking
 * the final replacement EOF frame. A failed upload is swallowed only by the
 * internal barrier so the next upload remains usable; its caller still gets
 * the original rejection.
 */
const createMITMV2ReplacementUploadController = ({
  isStreamRunning,
  getSendMessageAndWait,
  chunkSize = DEFAULT_MITMV2_REPLACEMENT_CHUNK_SIZE,
}) => {
  let barrier = Promise.resolve()

  return {
    replace: (params) => {
      const upload = barrier.then(async () => {
        const sendMessageAndWait = getSendMessageAndWait?.()
        if (!isStreamRunning?.() || typeof sendMessageAndWait !== 'function') {
          throw new Error('MITM stream is not running')
        }
        return uploadMITMV2ReplacementFile(sendMessageAndWait, params, chunkSize)
      })
      barrier = upload.catch(() => {})
      return upload
    },
    waitForIdle: () => barrier,
  }
}

module.exports = {
  DEFAULT_MITMV2_REPLACEMENT_CHUNK_SIZE,
  uploadMITMV2ReplacementFile,
  createMITMV2ReplacementUploadController,
}

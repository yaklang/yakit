import fs from 'node:fs'
import path from 'node:path'
import type { MITMV2Request } from '../../shared/generated/grpc/types'

export interface ReplacementParams {
  TaskID: string
  ReplaceBody?: boolean
  PartIndex?: number
  FilePath: string
}
type SendMessage = (message: MITMV2Request) => Promise<void>
type Chunk = { Data?: Uint8Array; Start?: boolean; EOF?: boolean; Cancel?: boolean }

const DEFAULT_MITMV2_REPLACEMENT_CHUNK_SIZE = 1024 * 1024

/**
 * Stream one GUI-local replacement file through the active MITMv2 control
 * stream. Unlike UploadToTemporaryFile, this protocol also binds the bytes to
 * one intercepted TaskID and either the whole body or one multipart PartIndex.
 */
const uploadMITMV2ReplacementFile = async (
  sendMessageAndWait: SendMessage,
  params: ReplacementParams,
  chunkSize = DEFAULT_MITMV2_REPLACEMENT_CHUNK_SIZE,
  signal?: AbortSignal,
) => {
  if (typeof sendMessageAndWait !== 'function' || !Number.isSafeInteger(chunkSize) || chunkSize <= 0) {
    throw new Error('invalid MITM replacement upload parameters')
  }

  const { TaskID, ReplaceBody, PartIndex, FilePath } = params || {}
  const replaceBody = ReplaceBody === true
  if (
    !TaskID ||
    (!replaceBody && (typeof PartIndex !== 'number' || !Number.isInteger(PartIndex) || PartIndex < 0)) ||
    !FilePath
  ) {
    throw new Error('invalid large request replacement parameters')
  }

  const stat = await fs.promises.stat(FilePath)
  if (!stat.isFile()) {
    throw new Error('large request replacement path is not a file')
  }

  const filename = path.basename(FilePath)
  let started = false
  const sendChunk = async ({ Data = Buffer.alloc(0), Start = false, EOF = false, Cancel = false }: Chunk) => {
    if (!Cancel && signal?.aborted)
      throw Object.assign(new Error('MITM replacement upload aborted'), { code: 'ABORTED' })
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
  const sendFileChunk = async ({ Data = Buffer.alloc(0), EOF = false }: Pick<Chunk, 'Data' | 'EOF'>) => {
    const Start = !started
    // Mark the upload as started before awaiting the write so a partial
    // first-chunk failure still sends a best-effort cancel to the engine.
    started = true
    await sendChunk({ Data, Start, EOF })
  }

  try {
    const fileStream = fs.createReadStream(FilePath, { highWaterMark: chunkSize, signal })
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
}: {
  isStreamRunning: () => boolean
  getSendMessageAndWait: () => SendMessage | undefined
  chunkSize?: number
}) => {
  let barrier = Promise.resolve()

  return {
    replace: (params: ReplacementParams, signal?: AbortSignal) => {
      const sendMessageAndWait = getSendMessageAndWait()
      const upload = barrier.then(async () => {
        if (!isStreamRunning?.() || typeof sendMessageAndWait !== 'function') {
          throw new Error('MITM stream is not running')
        }
        const sendToOriginalStream: SendMessage = (message) => {
          if (!isStreamRunning() || getSendMessageAndWait() !== sendMessageAndWait)
            return Promise.reject(new Error('MITM stream changed during replacement upload'))
          return sendMessageAndWait(message)
        }
        return uploadMITMV2ReplacementFile(sendToOriginalStream, params, chunkSize, signal)
      })
      barrier = upload.then(
        () => {},
        () => {},
      )
      return upload
    },
    waitForIdle: () => barrier,
  }
}

export { DEFAULT_MITMV2_REPLACEMENT_CHUNK_SIZE, uploadMITMV2ReplacementFile, createMITMV2ReplacementUploadController }

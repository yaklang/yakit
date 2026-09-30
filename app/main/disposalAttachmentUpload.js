const fs = require('fs')
const customPath = require('path')
const { Readable } = require('stream')

const DISPOSAL_ATTACHMENT_TYPES = new Set(['RiskComment', 'HttpflowComment'])
const DISPOSAL_ATTACHMENT_MAX_SIZE = 100 * 1024 * 1024
const DISPOSAL_ATTACHMENT_CHUNK_SIZE = 20 * 1024 * 1024

const uploadDisposalAttachmentFile = async ({
  path,
  url,
  token,
  type,
  filedHash,
  postChunk,
  stat = fs.promises.stat,
  createReadStream = fs.createReadStream,
}) => {
  const { size } = await stat(path)
  if (size > DISPOSAL_ATTACHMENT_MAX_SIZE) {
    throw new Error('附件大小不能超过100MB')
  }

  const fileName = customPath.basename(path)
  const totalChunks = Math.max(1, Math.ceil(size / DISPOSAL_ATTACHMENT_CHUNK_SIZE))
  const resArr = []

  for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
    const start = chunkIndex * DISPOSAL_ATTACHMENT_CHUNK_SIZE
    const end = Math.min(start + DISPOSAL_ATTACHMENT_CHUNK_SIZE, size) - 1
    const chunkStream = size === 0 ? Readable.from([]) : createReadStream(path, { start, end })
    try {
      const res = await postChunk({
        url,
        chunkStream,
        chunkIndex,
        totalChunks,
        fileName,
        type,
        fileHash: filedHash,
        token,
        isDisposalAttachment: true,
      })
      resArr.push(res)
    } finally {
      chunkStream.destroy()
    }
  }

  return { TaskStatus: true, resArr }
}

module.exports = {
  DISPOSAL_ATTACHMENT_TYPES,
  DISPOSAL_ATTACHMENT_MAX_SIZE,
  DISPOSAL_ATTACHMENT_CHUNK_SIZE,
  uploadDisposalAttachmentFile,
}

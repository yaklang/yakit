const path = require('node:path')
const {
  DISPOSAL_ATTACHMENT_MAX_SIZE,
  DISPOSAL_ATTACHMENT_CHUNK_SIZE,
  uploadDisposalAttachmentFile,
} = require('../disposalAttachmentUpload')

describe('disposal attachment split upload', () => {
  const makeRequest = ({ size, postChunk = vi.fn().mockResolvedValue({ code: 200, data: {} }) }) => {
    const stat = vi.fn().mockResolvedValue({ size })
    const createReadStream = vi.fn((path, range) => ({ path, range, destroy: vi.fn() }))
    const request = uploadDisposalAttachmentFile({
      url: 'fragment/upload',
      path: path.join('tmp', 'attachment.zip'),
      filedHash: 'risk-hash',
      type: 'RiskComment',
      postChunk,
      stat,
      createReadStream,
    })
    return { request, stat, createReadStream, postChunk }
  }

  it('accepts exactly 100MiB and uploads five contiguous 20MiB chunks', async () => {
    const responses = [
      { code: 200, data: {} },
      { code: 200, data: {} },
      { code: 200, data: {} },
      { code: 200, data: {} },
      { code: 200, data: { from: 'https://files.example/attachment.zip' } },
    ]
    const postChunk = vi.fn(async () => responses.shift())
    const { request, createReadStream } = makeRequest({
      size: DISPOSAL_ATTACHMENT_MAX_SIZE,
      postChunk,
    })

    const result = await request

    expect(createReadStream.mock.calls.map(([, range]) => range)).toEqual([
      { start: 0, end: DISPOSAL_ATTACHMENT_CHUNK_SIZE - 1 },
      { start: DISPOSAL_ATTACHMENT_CHUNK_SIZE, end: 2 * DISPOSAL_ATTACHMENT_CHUNK_SIZE - 1 },
      { start: 2 * DISPOSAL_ATTACHMENT_CHUNK_SIZE, end: 3 * DISPOSAL_ATTACHMENT_CHUNK_SIZE - 1 },
      { start: 3 * DISPOSAL_ATTACHMENT_CHUNK_SIZE, end: 4 * DISPOSAL_ATTACHMENT_CHUNK_SIZE - 1 },
      { start: 4 * DISPOSAL_ATTACHMENT_CHUNK_SIZE, end: DISPOSAL_ATTACHMENT_MAX_SIZE - 1 },
    ])
    expect(postChunk).toHaveBeenCalledTimes(5)
    expect(postChunk.mock.calls.every(([request]) => request.isDisposalAttachment)).toBe(true)
    expect(result.TaskStatus).toBe(true)
    expect(result.resArr.at(-1).data.from).toBe('https://files.example/attachment.zip')
  })

  it('rejects an attachment over 100MiB before opening or posting it', async () => {
    const { request, createReadStream, postChunk } = makeRequest({
      size: DISPOSAL_ATTACHMENT_MAX_SIZE + 1,
    })

    await expect(request).rejects.toThrow('附件大小不能超过100MB')
    expect(createReadStream).not.toHaveBeenCalled()
    expect(postChunk).not.toHaveBeenCalled()
  })

  it('uploads an empty attachment as one named chunk', async () => {
    const postChunk = vi.fn().mockResolvedValue({ code: 200, data: 'https://files.example/empty.txt' })
    const { request, createReadStream } = makeRequest({ size: 0, postChunk })

    const result = await request

    expect(createReadStream).not.toHaveBeenCalled()
    expect(postChunk).toHaveBeenCalledOnce()
    expect(postChunk.mock.calls[0][0]).toMatchObject({
      chunkIndex: 0,
      totalChunks: 1,
      fileName: 'attachment.zip',
      isDisposalAttachment: true,
    })
    expect(result.resArr).toEqual([{ code: 200, data: 'https://files.example/empty.txt' }])
  })

  it('rejects immediately when a chunk upload fails', async () => {
    const postChunk = vi
      .fn()
      .mockResolvedValueOnce({ code: 200, data: {} })
      .mockRejectedValueOnce(new Error('network down'))
    const { request, createReadStream } = makeRequest({ size: DISPOSAL_ATTACHMENT_CHUNK_SIZE + 1, postChunk })

    await expect(request).rejects.toThrow('network down')
    expect(postChunk).toHaveBeenCalledTimes(2)
    expect(createReadStream.mock.results[1].value.destroy).toHaveBeenCalledOnce()
  })
})

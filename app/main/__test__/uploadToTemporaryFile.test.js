const fs = require('fs')
const os = require('os')
const path = require('path')
const { EventEmitter } = require('events')
const { uploadLocalFileToEngine } = require('../handlers/uploadToTemporaryFile')

const makeClient = ({ writeError } = {}) => {
  const chunks = []
  let callback
  const stream = new EventEmitter()
  stream.cancelled = false
  stream.write = ({ Data }, done) => {
    if (writeError) {
      done(writeError)
      return
    }
    chunks.push(Buffer.from(Data))
    done()
  }
  stream.end = () => {
    callback(null, { FileName: '/engine/temp/fuzztag-upload-1', Size: Buffer.concat(chunks).length })
  }
  stream.cancel = () => {
    stream.cancelled = true
  }
  const client = {
    UploadToTemporaryFile: (done) => {
      callback = done
      return stream
    },
  }
  return { client, chunks, stream }
}

describe('uploadLocalFileToEngine', () => {
  let tempDir

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'yakit-upload-test-'))
  })

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true })
  })

  it('preserves bytes across bounded chunks and returns an engine path', async () => {
    const source = path.join(tempDir, 'local.pdf')
    const want = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x00, 0xff, 0x80])
    fs.writeFileSync(source, want)
    const { client, chunks } = makeClient()

    const result = await uploadLocalFileToEngine(() => client, source, 3)

    expect(result.FileName).toBe('/engine/temp/fuzztag-upload-1')
    expect(result.Size).toBe(want.length)
    expect(chunks.map((chunk) => chunk.length)).toEqual([3, 3, 1])
    expect(Buffer.concat(chunks)).toEqual(want)
  })

  it('cancels the engine stream when a chunk fails', async () => {
    const source = path.join(tempDir, 'local.bin')
    fs.writeFileSync(source, Buffer.from('payload'))
    const writeError = new Error('remote stream failed')
    const { client, stream } = makeClient({ writeError })

    await expect(uploadLocalFileToEngine(() => client, source, 3)).rejects.toThrow(writeError)
    expect(stream.cancelled).toBe(true)
  })

  it('supports an empty replacement without fabricating a data chunk', async () => {
    const source = path.join(tempDir, 'empty.bin')
    fs.writeFileSync(source, Buffer.alloc(0))
    const { client, chunks } = makeClient()

    const result = await uploadLocalFileToEngine(() => client, source, 3)

    expect(result.Size).toBe(0)
    expect(chunks).toEqual([])
  })
})

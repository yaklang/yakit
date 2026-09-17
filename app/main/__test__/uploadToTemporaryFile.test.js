const fs = require('fs')
const os = require('os')
const path = require('path')
const { EventEmitter } = require('events')
import { uploadLocalFileToEngine } from '../services/uploadToTemporaryFile'

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

  it('times out and cancels when the engine never completes the upload', async () => {
    const source = path.join(tempDir, 'hang.bin')
    fs.writeFileSync(source, Buffer.from('hang'))
    const { client, stream } = makeClient()
    stream.end = () => {}

    await expect(uploadLocalFileToEngine(() => client, source, 3, 20)).rejects.toThrow(
      'UploadToTemporaryFile timed out waiting for engine response',
    )
    expect(stream.cancelled).toBe(true)
  })
  it('aborts a stalled write without waiting for the chunk deadline', async () => {
    const source = path.join(tempDir, 'stalled.bin')
    fs.writeFileSync(source, Buffer.from('payload'))
    const { client, stream } = makeClient()
    let started
    const writing = new Promise((resolve) => {
      started = resolve
    })
    stream.write = () => {
      started()
      return false
    }
    const controller = new AbortController()
    const result = uploadLocalFileToEngine(() => client, source, 3, 60_000, controller.signal)
    const rejected = expect(result).rejects.toMatchObject({ code: 'ABORTED' })
    await writing
    controller.abort()
    await rejected
    expect(stream.cancelled).toBe(true)
    expect(stream.listenerCount('error')).toBe(1)
  })

  it('cancels a stalled chunk when its deadline expires', async () => {
    const source = path.join(tempDir, 'stalled.bin')
    fs.writeFileSync(source, Buffer.from('payload'))
    const { client, stream } = makeClient()
    stream.write = () => false
    await expect(uploadLocalFileToEngine(() => client, source, 3, 20)).rejects.toThrow('timed out writing a chunk')
    expect(stream.cancelled).toBe(true)
  })
})

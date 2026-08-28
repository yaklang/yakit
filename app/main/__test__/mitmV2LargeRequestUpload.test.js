const fs = require('fs')
const os = require('os')
const path = require('path')
const {
  uploadMITMV2ReplacementFile,
  createMITMV2ReplacementUploadController,
} = require('../handlers/mitmV2LargeRequestUpload')

const cloneMessage = (message) => ({
  ...message,
  ManualHijackMessage: {
    ...message.ManualHijackMessage,
    LargeRequestFileData: Buffer.from(message.ManualHijackMessage.LargeRequestFileData),
  },
})

const deferred = () => {
  let resolve
  let reject
  const promise = new Promise((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

describe('MITMv2 replacement upload IPC contract', () => {
  let tempDir

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'yakit-mitmv2-replacement-test-'))
  })

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true })
  })

  it('streams an exact multipart replacement with TaskID, PartIndex, Start and EOF', async () => {
    const filePath = path.join(tempDir, 'local.pdf')
    const want = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x00, 0xff, 0x80])
    fs.writeFileSync(filePath, want)
    const sent = []

    const result = await uploadMITMV2ReplacementFile(
      async (message) => sent.push(cloneMessage(message)),
      { TaskID: 'task-multipart', ReplaceBody: false, PartIndex: 3, FilePath: filePath },
      3,
    )

    expect(result).toEqual({ Filename: 'local.pdf', Size: want.length })
    expect(sent).toHaveLength(4)
    expect(sent.every((message) => message.ManualHijackControl)).toBe(true)
    const chunks = sent.map((message) => message.ManualHijackMessage)
    expect(chunks.every((chunk) => chunk.TaskID === 'task-multipart')).toBe(true)
    expect(chunks.every((chunk) => chunk.IsLargeRequestFileChunk)).toBe(true)
    expect(chunks.every((chunk) => chunk.LargeRequestPartIndex === 3)).toBe(true)
    expect(chunks.every((chunk) => !('LargeRequestFilename' in chunk))).toBe(true)
    expect(chunks.every((chunk) => chunk.LargeRequestReplaceBody === false)).toBe(true)
    expect(chunks.map((chunk) => chunk.LargeRequestFileStart)).toEqual([true, false, false, false])
    expect(chunks.map((chunk) => chunk.LargeRequestFileEOF)).toEqual([false, false, false, true])
    expect(chunks.every((chunk) => chunk.LargeRequestFileCancel === false)).toBe(true)
    expect(Buffer.concat(chunks.map((chunk) => chunk.LargeRequestFileData))).toEqual(want)
  })

  it('binds a whole-body replacement to part index zero', async () => {
    const filePath = path.join(tempDir, 'body.bin')
    fs.writeFileSync(filePath, Buffer.from('body'))
    const sent = []

    await uploadMITMV2ReplacementFile(
      async (message) => sent.push(cloneMessage(message)),
      { TaskID: 'task-body', ReplaceBody: true, PartIndex: 99, FilePath: filePath },
      8,
    )

    const chunks = sent.map((message) => message.ManualHijackMessage)
    expect(chunks.every((chunk) => chunk.LargeRequestPartIndex === 0)).toBe(true)
    expect(chunks.every((chunk) => chunk.LargeRequestReplaceBody === true)).toBe(true)
  })

  it('represents an empty replacement with one Start+EOF frame', async () => {
    const filePath = path.join(tempDir, 'empty.bin')
    fs.writeFileSync(filePath, Buffer.alloc(0))
    const sent = []

    const result = await uploadMITMV2ReplacementFile(
      async (message) => sent.push(cloneMessage(message)),
      { TaskID: 'task-empty', ReplaceBody: false, PartIndex: 1, FilePath: filePath },
      3,
    )

    expect(result.Size).toBe(0)
    expect(sent).toHaveLength(1)
    expect(sent[0].ManualHijackMessage).toMatchObject({
      LargeRequestFileStart: true,
      LargeRequestFileEOF: true,
      LargeRequestFileCancel: false,
    })
    expect(sent[0].ManualHijackMessage.LargeRequestFileData).toEqual(Buffer.alloc(0))
  })

  it('sends a best-effort Cancel and preserves the original error when streaming fails', async () => {
    const filePath = path.join(tempDir, 'failure.bin')
    fs.writeFileSync(filePath, Buffer.from('payload'))
    const sent = []
    const streamError = new Error('MITM stream write failed')

    await expect(
      uploadMITMV2ReplacementFile(
        async (message) => {
          sent.push(cloneMessage(message))
          if (!message.ManualHijackMessage.LargeRequestFileCancel) throw streamError
        },
        { TaskID: 'task-failure', ReplaceBody: false, PartIndex: 2, FilePath: filePath },
        3,
      ),
    ).rejects.toThrow(streamError)

    expect(sent).toHaveLength(2)
    expect(sent[0].ManualHijackMessage.LargeRequestFileStart).toBe(true)
    expect(sent[1].ManualHijackMessage).toMatchObject({
      TaskID: 'task-failure',
      LargeRequestPartIndex: 2,
      LargeRequestFileCancel: true,
    })
  })

  it('serializes uploads and makes waitForIdle cover the final EOF frame', async () => {
    const firstPath = path.join(tempDir, 'first.bin')
    const secondPath = path.join(tempDir, 'second.bin')
    fs.writeFileSync(firstPath, Buffer.from('first'))
    fs.writeFileSync(secondPath, Buffer.from('second'))
    const firstWrite = deferred()
    const firstSend = deferred()
    const sentTaskIDs = []
    let writeCount = 0
    const controller = createMITMV2ReplacementUploadController({
      isStreamRunning: () => true,
      getSendMessageAndWait: () => async (message) => {
        sentTaskIDs.push(message.ManualHijackMessage.TaskID)
        writeCount += 1
        if (writeCount === 1) {
          firstSend.resolve()
          await firstWrite.promise
        }
      },
      chunkSize: 32,
    })

    const first = controller.replace({ TaskID: 'first', ReplaceBody: true, FilePath: firstPath })
    const second = controller.replace({ TaskID: 'second', ReplaceBody: true, FilePath: secondPath })
    let idle = false
    const waited = controller.waitForIdle().then(() => {
      idle = true
    })
    await firstSend.promise
    expect(sentTaskIDs).toEqual(['first'])
    expect(idle).toBe(false)

    firstWrite.resolve()
    await Promise.all([first, second, waited])
    expect(sentTaskIDs).toEqual(['first', 'first', 'second', 'second'])
    expect(idle).toBe(true)
  })

  it('rejects when the MITM stream is absent without poisoning the next upload', async () => {
    const filePath = path.join(tempDir, 'retry.bin')
    fs.writeFileSync(filePath, Buffer.from('retry'))
    let running = false
    const sent = []
    const controller = createMITMV2ReplacementUploadController({
      isStreamRunning: () => running,
      getSendMessageAndWait: () => async (message) => sent.push(cloneMessage(message)),
      chunkSize: 32,
    })

    await expect(
      controller.replace({ TaskID: 'missing-stream', ReplaceBody: true, FilePath: filePath }),
    ).rejects.toThrow('MITM stream is not running')

    running = true
    await expect(controller.replace({ TaskID: 'recovered', ReplaceBody: true, FilePath: filePath })).resolves.toEqual({
      Filename: 'retry.bin',
      Size: 5,
    })
    expect(sent.map((message) => message.ManualHijackMessage.TaskID)).toEqual(['recovered', 'recovered'])
  })
})

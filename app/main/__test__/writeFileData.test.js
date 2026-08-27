const fs = require('fs')
const os = require('os')
const path = require('path')
const { writeFileData } = require('../handlers/writeFileData')

describe('writeFileData', () => {
  let tempDir

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'yakit-binary-export-test-'))
  })

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true })
  })

  it('writes Uint8Array bytes exactly without UTF-8 replacement characters', async () => {
    const output = path.join(tempDir, 'export.bin')
    const source = Uint8Array.from([0x25, 0x50, 0x44, 0x46, 0x0a, 0x93, 0x8c, 0x8b, 0x9e, 0xff, 0x00])

    await expect(writeFileData(output, source)).resolves.toBe('success')
    expect(fs.readFileSync(output)).toEqual(Buffer.from(source))
  })

  it('writes exported Fuzztag text exactly without interpreting its escapes', async () => {
    const output = path.join(tempDir, 'fuzztag.txt')
    const source = '{{unquote("A\\x60\\xff\\x28\\x7d")}}'

    await expect(writeFileData(output, source)).resolves.toBe('success')
    expect(fs.readFileSync(output, 'utf8')).toBe(source)
  })
})

import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { FieldSelection } from '../pcapUtils'

const { readBytes, setText, writeFile, saveDialog, success, failed } = vi.hoisted(() => ({
  readBytes: vi.fn(),
  setText: vi.fn(),
  writeFile: vi.fn(),
  saveDialog: vi.fn(),
  success: vi.fn(),
  failed: vi.fn(),
}))

vi.mock('@/services/electronBridge', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  yakitClipboard: { setText },
  yakitDialog: { writeFile },
  yakitTraffic: { readBytes },
}))
vi.mock('@/utils/fileSystemDialog', () => ({ handleSaveFileSystemDialog: saveDialog }))
vi.mock('@/utils/notification', () => ({ success, failed }))

import { bytesToBase64, copySelection, readSelectionBytes, saveSelection } from '../pcapByteActions'

const selection: FieldSelection = {
  sourceID: 'message:7',
  ranges: [
    [15, 17],
    [19, 20],
  ],
  label: 'Status Code',
}

beforeEach(() => {
  vi.clearAllMocks()
  readBytes.mockImplementation(async ({ Offset, Length }) => {
    const offset = Number(Offset)
    const length = Number(Length)
    return {
      Data: new Uint8Array(Array.from({ length }, (_, index) => offset + index)),
      Offset,
      TotalLength: '20',
      EOF: offset + length >= 20,
    }
  })
  setText.mockResolvedValue(undefined)
  writeFile.mockResolvedValue(undefined)
  saveDialog.mockResolvedValue({ canceled: false, filePath: '/tmp/status-code.bin' })
})

describe('PCAP node byte actions', () => {
  it('reads every selected range and copies it as HEX', async () => {
    expect([...(await readSelectionBytes('dataset', selection))]).toEqual([15, 16, 19])
    await copySelection('dataset', selection, 'hex')
    expect(setText).toHaveBeenCalledWith('0f 10 13')
    expect(success).toHaveBeenCalled()
  })

  it('saves the exact node range as raw bytes', async () => {
    await saveSelection('dataset', selection, 'raw')
    expect(saveDialog).toHaveBeenCalledWith(
      expect.objectContaining({
        defaultPath: expect.stringMatching(/Status-Code\.bin$/),
      }),
    )
    expect(writeFile).toHaveBeenCalledWith({
      route: '/tmp/status-code.bin',
      data: new Uint8Array([15, 16, 19]),
    })
  })

  it('encodes Base64 without large argument expansion', () => {
    expect(bytesToBase64(new Uint8Array([0, 255]))).toBe('AP8=')
  })
})

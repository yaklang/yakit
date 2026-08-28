import { describe, expect, it } from 'vitest'
import { normalizeFileExportData } from '../fileExport'

describe('normalizeFileExportData', () => {
  it('preserves binary Uint8Array bytes instead of decoding them as UTF-8 text', () => {
    // PDF/ZIP 等数据可合法包含非法 UTF-8。若先经过 TextDecoder，0x93 会
    // 变成 U+FFFD，最终写盘为 ef bf bd，文件长度和内容都会改变。
    const source = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x0a, 0x93, 0x8c, 0x8b, 0x9e])
    const normalized = normalizeFileExportData(source)

    expect(normalized).toBe(source)
    expect(Array.from(normalized as Uint8Array)).toEqual(Array.from(source))
  })

  it('keeps text exports as strings and maps missing data to an empty string', () => {
    expect(normalizeFileExportData('text')).toBe('text')
    expect(normalizeFileExportData()).toBe('')
  })
})

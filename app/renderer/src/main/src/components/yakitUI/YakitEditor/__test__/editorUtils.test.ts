import { describe, expect, it } from 'vitest'
import type { YakitIMonacoEditor } from '../YakitEditorType'
import { collapseBinaryFuzztag, registerBinaryFoldEntries, unregisterBinaryFoldEntries } from '../binaryFuzztag'
import { resolveWebFuzzerPacket } from '../editorUtils'

describe('resolveWebFuzzerPacket', () => {
  it('History 中可见的 file 引用优先于旧 originValue，并原样发送到 WebFuzzer', () => {
    const currentPacket =
      'POST /upload HTTP/1.1\r\nHost: example.test\r\n\r\n{{file(/engine/yakit-projects/temp/original.pdf)}}'
    const { text, entries } = collapseBinaryFuzztag(currentPacket)
    expect(text).toBe(currentPacket)
    expect(entries.size).toBe(0)
    const model = { getValue: () => text }
    const editor = { getModel: () => model } as unknown as YakitIMonacoEditor
    registerBinaryFoldEntries(model, entries)

    try {
      expect(resolveWebFuzzerPacket(editor, 'OLD-ORIGINAL-REQUEST')).toBe(currentPacket)
      expect(resolveWebFuzzerPacket(editor, 'OLD-ORIGINAL-REQUEST')).not.toContain('#YBIN_')
    } finally {
      unregisterBinaryFoldEntries(model)
    }
  })

  it('editor 尚未挂载时使用原请求兜底', () => {
    expect(resolveWebFuzzerPacket(undefined, 'ORIGINAL-REQUEST')).toBe('ORIGINAL-REQUEST')
  })
})

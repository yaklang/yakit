import { describe, it, expect } from 'vitest'
import {
  BINARY_FOLD_THRESHOLD,
  buildChipLabel,
  collapseBinaryFuzztag,
  expandBinaryFuzztag,
  findPlaceholderOffsets,
  goUnquoteToBytes,
  bytesToHex,
  setBinaryChangeInfo,
  isBinaryChanged,
} from '../binaryFuzztag'

const bigUnquoteContent = '"' + '\\xff\\xd8'.repeat(40) + '"' // 远大于阈值
const bigUnquoteTag = `{{unquote(${bigUnquoteContent})}}`

describe('binaryFuzztag collapse/expand', () => {
  it('折叠大 unquote 标签为占位，侧表含一条记录', () => {
    const raw = `POST /a HTTP/1.1\r\nHost: x\r\n\r\n${bigUnquoteTag}`
    const { text, entries } = collapseBinaryFuzztag(raw)
    expect(text).not.toContain('\\xff')
    expect(text).toContain('#YBIN_')
    expect(entries.size).toBe(1)
    const entry = Array.from(entries.values())[0]
    expect(entry.kind).toBe('unquote')
    expect(entry.editable).toBe(true)
    expect(entry.originalTagText).toBe(bigUnquoteTag)
  })

  it('round-trip: expand(collapse(x)) === x', () => {
    const raw = `prefix ${bigUnquoteTag} suffix`
    const { text, entries } = collapseBinaryFuzztag(raw)
    expect(expandBinaryFuzztag(text, entries)).toBe(raw)
  })

  it('幂等稳定: collapse(expand(placeholder)) === placeholder（防受控组件覆盖死循环）', () => {
    const raw = `a ${bigUnquoteTag} b ${bigUnquoteTag} c`
    const first = collapseBinaryFuzztag(raw)
    const expanded = expandBinaryFuzztag(first.text, first.entries)
    const second = collapseBinaryFuzztag(expanded)
    expect(second.text).toBe(first.text)
  })

  it('内容短于阈值不折叠', () => {
    const small = `{{unquote("` + 'A'.repeat(BINARY_FOLD_THRESHOLD - 10) + `")}}`
    const { text, entries } = collapseBinaryFuzztag(small)
    expect(text).toBe(small)
    expect(entries.size).toBe(0)
  })

  it('识别 hex / base64 标签', () => {
    const hexTag = `{{hexdec(${'ab'.repeat(40)})}}`
    const b64Tag = `{{base64decode(${'QUJD'.repeat(20)})}}`
    const hexRes = collapseBinaryFuzztag(hexTag)
    const b64Res = collapseBinaryFuzztag(b64Tag)
    expect(Array.from(hexRes.entries.values())[0].kind).toBe('hex')
    expect(Array.from(b64Res.entries.values())[0].kind).toBe('base64')
  })

  it('findPlaceholderOffsets 定位占位', () => {
    const raw = `x ${bigUnquoteTag} y`
    const { text } = collapseBinaryFuzztag(raw)
    const offsets = findPlaceholderOffsets(text)
    expect(offsets.length).toBe(1)
    expect(text.slice(offsets[0].start, offsets[0].end)).toContain('#YBIN_')
  })

  it('未知标签 / 普通 fuzztag 不受影响', () => {
    const raw = `id={{int(1-2)}}&q={{base64enc(abc)}}`
    const { text, entries } = collapseBinaryFuzztag(raw)
    expect(text).toBe(raw)
    expect(entries.size).toBe(0)
  })

  it('unquote 内容含 }} / {{ / ) 等字符仍能正确折叠并 round-trip', () => {
    const payload = 'A'.repeat(40) + '}}' + '{{' + ')(' + 'C'.repeat(40)
    const tag = `{{unquote("${payload}")}}`
    const raw = `head\r\n\r\n${tag}\r\ntail`
    const { text, entries } = collapseBinaryFuzztag(raw)
    expect(entries.size).toBe(1)
    expect(text).toContain('#YBIN_')
    // 占位不应把内容里的 }} 当作标签结束而截断
    expect(text).toContain('tail')
    expect(expandBinaryFuzztag(text, entries)).toBe(raw)
  })

  it('提交后重折叠幂等：collapse(expand)=占位（含 }} 内容）', () => {
    const payload = 'X'.repeat(80) + '}}'
    const tag = `{{unquote("${payload}")}}`
    const first = collapseBinaryFuzztag(tag)
    const second = collapseBinaryFuzztag(expandBinaryFuzztag(first.text, first.entries))
    expect(second.text).toBe(first.text)
  })
})

describe('binaryFuzztag change-info', () => {
  it('记录改动后 buildChipLabel 显示 Changed 且样式判定为已改', () => {
    const { entries } = collapseBinaryFuzztag(bigUnquoteTag)
    const entry = Array.from(entries.values())[0]
    setBinaryChangeInfo(entry.id, { addedCount: 12, overriddenCount: 5, removedCount: 0 })
    const label = buildChipLabel(entry)
    expect(label).toContain('Binary[')
    expect(label).toContain('Changed:')
    expect(label).toContain('+12add')
    expect(label).toContain('~5override')
    // 标签内不得含空格（editor renderWhitespace:'all' 会把空格渲染成 middot）
    expect(label).not.toContain(' ')
    expect(isBinaryChanged(entry.id)).toBe(true)
  })
})

describe('goUnquoteToBytes', () => {
  it('解析 \\xNN 转义', () => {
    const bytes = goUnquoteToBytes('"\\xff\\xd8\\x00A"')
    expect(Array.from(bytes)).toEqual([255, 216, 0, 65])
  })

  it('解析常见控制符转义', () => {
    const bytes = goUnquoteToBytes('"\\n\\r\\t\\\\"')
    expect(Array.from(bytes)).toEqual([10, 13, 9, 92])
  })
})

describe('buildChipLabel', () => {
  it('binary 小块包含字节数且不含空格', () => {
    const { entries } = collapseBinaryFuzztag(bigUnquoteTag)
    const entry = Array.from(entries.values())[0]
    const label = buildChipLabel(entry)
    expect(label).toMatch(/Binary\[.*\d+B/)
    expect(label).not.toContain(' ')
  })
})

describe('bytesToHex', () => {
  it('字节转 hex', () => {
    expect(bytesToHex(new Uint8Array([0, 255, 16]))).toBe('00ff10')
  })
})

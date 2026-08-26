import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  buildChipLabel,
  collapseBinaryFuzztag,
  expandBinaryFuzztag,
  expandBinaryFuzztagByModelKey,
  registerBinaryFoldEntries,
  unregisterBinaryFoldEntries,
  findPlaceholderOffsets,
  goUnquoteToBytes,
  goUnquotePreview,
  bytesToHex,
  packetTextToRawBytes,
  rawBytesToPacketText,
  bytesToUnquoteString,
  decodeBinaryTag,
  encodeBytesToTag,
  canLocateFileReference,
  findFileFuzztagPathAtOffset,
  strQuoteBytesViaCodec,
} from '../binaryFuzztag'

const HEX_DIGITS = '0123456789abcdef'

/** 独立参考实现：模拟 Go strconv.Quote 对原始字节的转义（用于对照 Codec StrQuote） */
const referenceGoStrconvQuoteBytes = (bytes: Uint8Array): string => {
  let quoted = '"'
  for (let i = 0; i < bytes.length; ) {
    const b = bytes[i] & 0xff
    let rune = b
    let width = 1

    if (b >= 0xc0) {
      const decoded = decodeUtf8RuneAt(bytes, i)
      if (decoded) {
        rune = decoded.rune
        width = decoded.width
      }
    }

    if (width === 1 && b >= 0x80) {
      quoted += `\\x${HEX_DIGITS[b >> 4]}${HEX_DIGITS[b & 0x0f]}`
      i += 1
      continue
    }

    if (rune === 0x07) quoted += '\\a'
    else if (rune === 0x08) quoted += '\\b'
    else if (rune === 0x0c) quoted += '\\f'
    else if (rune === 0x0a) quoted += '\\n'
    else if (rune === 0x0d) quoted += '\\r'
    else if (rune === 0x09) quoted += '\\t'
    else if (rune === 0x0b) quoted += '\\v'
    else if (rune === 0x5c) quoted += '\\\\'
    else if (rune === 0x22) quoted += '\\"'
    else if (rune >= 0x20 && rune < 0x7f) quoted += String.fromCharCode(rune)
    else if (width === 1 && rune < 0x20) {
      quoted += `\\x${HEX_DIGITS[b >> 4]}${HEX_DIGITS[b & 0x0f]}`
    } else if (rune > 0xffff) {
      quoted += `\\U${rune.toString(16).padStart(8, '0')}`
    } else if (rune > 0x7e || rune < 0x20) {
      quoted += `\\u${rune.toString(16).padStart(4, '0')}`
    } else {
      quoted += String.fromCodePoint(rune)
    }
    i += width
  }
  return `${quoted}"`
}

const decodeUtf8RuneAt = (bytes: Uint8Array, index: number): { rune: number; width: number } | null => {
  const b0 = bytes[index] & 0xff
  if (b0 < 0x80) {
    return { rune: b0, width: 1 }
  }
  if ((b0 & 0xe0) === 0xc0 && index + 1 < bytes.length) {
    const b1 = bytes[index + 1] & 0xff
    if ((b1 & 0xc0) === 0x80) {
      return { rune: ((b0 & 0x1f) << 6) | (b1 & 0x3f), width: 2 }
    }
  }
  if ((b0 & 0xf0) === 0xe0 && index + 2 < bytes.length) {
    const b1 = bytes[index + 1] & 0xff
    const b2 = bytes[index + 2] & 0xff
    if ((b1 & 0xc0) === 0x80 && (b2 & 0xc0) === 0x80) {
      return { rune: ((b0 & 0x0f) << 12) | ((b1 & 0x3f) << 6) | (b2 & 0x3f), width: 3 }
    }
  }
  if ((b0 & 0xf8) === 0xf0 && index + 3 < bytes.length) {
    const b1 = bytes[index + 1] & 0xff
    const b2 = bytes[index + 2] & 0xff
    const b3 = bytes[index + 3] & 0xff
    if ((b1 & 0xc0) === 0x80 && (b2 & 0xc0) === 0x80 && (b3 & 0xc0) === 0x80) {
      return {
        rune: ((b0 & 0x07) << 18) | ((b1 & 0x3f) << 12) | ((b2 & 0x3f) << 6) | (b3 & 0x3f),
        width: 4,
      }
    }
  }
  return null
}

const hexToBytes = (hex: string): Uint8Array => {
  const normalized = hex.replace(/\s+/g, '')
  const arr = new Uint8Array(normalized.length / 2)
  for (let i = 0; i < arr.length; i++) {
    arr[i] = parseInt(normalized.substr(i * 2, 2), 16) & 0xff
  }
  return arr
}

const mockNewCodec = ({ Text, WorkFlow }: { Text: string; WorkFlow: { CodecType: string }[] }) => {
  let result = Text
  let rawResult: Uint8Array = new Uint8Array()
  for (const step of WorkFlow) {
    if (step.CodecType === 'HexDecode') {
      rawResult = new Uint8Array(hexToBytes(result))
      result = String.fromCharCode(...rawResult)
    } else if (step.CodecType === 'StrUnQuote') {
      // Electron IPC 的真实 NewCodec 会在 RawResult 返回解转义后的字节。
      // 若 mock 缺少这一分支，decodeBinaryTag 会得到空 Uint8Array，导致
      // “点击 Binary chip -> HEX 编辑 -> 写回”这条关键链路实际上从未被测试。
      rawResult = goUnquoteToBytes(result)
      result = String.fromCharCode(...rawResult)
    } else if (step.CodecType === 'StrQuote') {
      result = referenceGoStrconvQuoteBytes(rawResult)
    }
  }
  return { Result: result, RawResult: rawResult }
}

const bytesEqual = (a: Uint8Array, b: Uint8Array) => {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false
  }
  return true
}

const binaryQuoteCases: { name: string; bytes: number[] }[] = [
  { name: 'empty', bytes: [] },
  { name: 'printable ascii', bytes: [0x41, 0x62, 0x63, 0x20, 0x7e] },
  { name: 'control chars', bytes: [0x07, 0x08, 0x09, 0x0a, 0x0b, 0x0c, 0x0d] },
  { name: 'quote and backslash', bytes: [0x09, 0x22, 0xff] },
  { name: 'jpeg-like header', bytes: [0xff, 0xd8, 0xff, 0x00, 0x41] },
  { name: 'http binary body', bytes: [0x09, 0xe2, 0x51, 0x68] },
  { name: 'all high bytes', bytes: [0x80, 0xfe, 0xff] },
  { name: 'null and low bytes', bytes: [0x00, 0x01, 0x1f] },
]

let originalRequire: typeof window.require | undefined

beforeEach(() => {
  originalRequire = (window as any).require
  ;(window as any).require = () => ({
    ipcRenderer: {
      invoke: async (channel: string, params: { Text: string; WorkFlow: { CodecType: string }[] }) => {
        if (channel !== 'NewCodec') {
          throw new Error(`unexpected ipc channel: ${channel}`)
        }
        return mockNewCodec(params)
      },
    },
  })
})

afterEach(() => {
  if (originalRequire) {
    ;(window as any).require = originalRequire
  } else {
    delete (window as any).require
  }
})

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

  it('可编辑类型(unquote/hex/base64)无论内容大小都折叠', () => {
    // 远小于阈值的极短内容也应折叠为可点击小块
    const tinyUnquote = `{{unquote("\\xff")}}`
    const tinyHex = `{{hexdec(ab)}}`
    const tinyB64 = `{{base64decode(QQ==)}}`
    expect(collapseBinaryFuzztag(tinyUnquote).entries.size).toBe(1)
    expect(collapseBinaryFuzztag(tinyHex).entries.size).toBe(1)
    expect(collapseBinaryFuzztag(tinyB64).entries.size).toBe(1)
    // 折叠后正文不再含原始参数
    expect(collapseBinaryFuzztag(tinyUnquote).text).toContain('#YBIN_')
  })

  it('History 兼容展示正文原本就是字面量 \\xNN 的历史请求', () => {
    // 这不是 Binary HEX 编辑的正确输出；它表示线上实际正文就是四个 ASCII 字节 "\\x11"。
    // History 仍需忠实折叠和展示这类既有记录，但 HEX 窗口必须显示 5c 78 31 31，不能伪装成 0x11。
    const escapedLiteralBody = '\\\\x11'.repeat(30_000)
    const request = `POST /upload HTTP/1.1\r\nContent-Type: application/zip\r\n\r\n{{unquote("${escapedLiteralBody}")}}`
    const result = collapseBinaryFuzztag(request)

    expect(result.entries.size).toBe(1)
    expect(result.text).toContain('#YBIN_')
    expect(result.text).not.toContain(escapedLiteralBody)
    const entry = Array.from(result.entries.values())[0]
    expect(entry.byteLength).toBe(4 * 30_000)
    expect(entry.previewHex).toBe('5c783131')
    expect(expandBinaryFuzztag(result.text, result.entries)).toBe(request)
  })

  it('History 字面量转义正文含引号时仍完整折叠', () => {
    // 这类历史正文中还可能包含 0x22 的文本表示，该位置形如 `\\"`；旧解析器会把
    // 其中的引号误当成标签结尾，继而因后面不是 `)}}` 而放弃整段折叠。
    const tag = String.raw`{{unquote("\\x11\\"\\x9aPK\\x03\\x04")}}`
    const request = `POST /upload/case/safe HTTP/1.1\r\nContent-Type: application/zip\r\n\r\n${tag}`
    const result = collapseBinaryFuzztag(request)

    expect(result.entries.size).toBe(1)
    expect(result.text).toContain('#YBIN_')
    expect(result.text).not.toContain(tag)
    expect(expandBinaryFuzztag(result.text, result.entries)).toBe(request)
  })

  it('History 外置资源保留真实 file tag 和引擎路径，不生成 YBIN', () => {
    const tag = '{{file(/engine/yakit-projects/temp/large-request-body-id.txt)}}'
    const result = collapseBinaryFuzztag(tag)
    expect(result.text).toBe(tag)
    expect(result.text).not.toContain('#YBIN_')
    expect(result.entries.size).toBe(0)
  })

  it('只有 inline 二进制标签生成可编辑 entry', () => {
    const packet = '{{file(/tmp/a)}} {{unquote("\\xff")}}'
    const result = collapseBinaryFuzztag(packet)
    expect(result.entries.size).toBe(1)
    expect(Array.from(result.entries.values())[0].kind).toBe('unquote')
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

  it('占位被破坏(少一个})无法 expand；只要保留映射，补回后即可还原真实内容', () => {
    // 模拟：折叠得到占位与映射
    const first = collapseBinaryFuzztag(bigUnquoteTag)
    const placeholder = first.text // 形如 {{unquote(#YBIN_<id>#)}}
    // 累积保留映射（对应组件内 binaryFoldEntriesRef 的合并语义）
    const persistentEntries = new Map(first.entries)

    // backspace 破坏：删去末尾一个 }
    const broken = placeholder.slice(0, -1)
    // 破坏态无法匹配占位，expand 原样返回（此刻真实内容仅存于映射表中，不会被还原）
    expect(expandBinaryFuzztag(broken, persistentEntries)).toBe(broken)
    expect(broken).not.toBe(placeholder)

    // 补回 } 还原完整占位：因映射保留，可还原出原始真实标签
    const restored = broken + '}'
    expect(restored).toBe(placeholder)
    expect(expandBinaryFuzztag(restored, persistentEntries)).toBe(bigUnquoteTag)

    // 还原后再次折叠应得到相同占位（小块可重新渲染）
    const second = collapseBinaryFuzztag(expandBinaryFuzztag(restored, persistentEntries))
    expect(second.text).toBe(placeholder)
  })

  it('整表替换会丢失历史项导致无法恢复，累积合并则可恢复（对比验证）', () => {
    const first = collapseBinaryFuzztag(bigUnquoteTag)
    const placeholder = first.text
    const id = Array.from(first.entries.keys())[0]

    // 破坏态文本再 collapse：得不到任何折叠项（破坏的占位不是合法二进制标签）
    const broken = placeholder.slice(0, -1)
    const afterBroken = collapseBinaryFuzztag(broken)
    expect(afterBroken.entries.has(id)).toBe(false)

    // 整表替换语义：映射被清空 -> 即使补回占位也无法 expand
    const replacedMap = afterBroken.entries
    expect(expandBinaryFuzztag(placeholder, replacedMap)).toBe(placeholder)

    // 累积合并语义：保留历史项 -> 补回占位可正确 expand
    const mergedMap = new Map(first.entries)
    afterBroken.entries.forEach((v, k) => mergedMap.set(k, v))
    expect(expandBinaryFuzztag(placeholder, mergedMap)).toBe(bigUnquoteTag)
  })
})

describe('binaryFuzztag changed 标记（布尔，只记是否被修改）', () => {
  it('changed=true 时 buildChipLabel 只追加 |Changed（不含增删改细节）', () => {
    const { entries } = collapseBinaryFuzztag(bigUnquoteTag)
    const entry = Array.from(entries.values())[0]
    const label = buildChipLabel(entry, true)
    expect(label).toContain('Binary[')
    expect(label).toContain('|Changed')
    // 不再写细节
    expect(label).not.toContain('Changed:')
    expect(label).not.toContain('add')
    expect(label).not.toContain('override')
    // 标签内不得含空格（editor renderWhitespace:'all' 会把空格渲染成 middot）
    expect(label).not.toContain(' ')
  })

  it('changed=false（默认）时不追加 Changed 标记', () => {
    const { entries } = collapseBinaryFuzztag(bigUnquoteTag)
    const entry = Array.from(entries.values())[0]
    expect(buildChipLabel(entry)).not.toContain('Changed')
    expect(buildChipLabel(entry, false)).not.toContain('Changed')
  })

  it('file 真实文本仅允许本地单路径 Ctrl+点击定位', () => {
    const line = 'body={{file(/tmp/a.txt)}} tail'
    const offset = line.indexOf('/tmp/a.txt') + 2
    expect(findFileFuzztagPathAtOffset(line, offset)).toBe('/tmp/a.txt')
    expect(findFileFuzztagPathAtOffset(line, 0)).toBeUndefined()
    expect(canLocateFileReference(true, 'local', '/tmp/a.txt')).toBe(true)
    expect(canLocateFileReference(false, 'local', '/tmp/a.txt')).toBe(false)
    expect(canLocateFileReference(true, 'remote', '/tmp/a.txt')).toBe(false)
    expect(canLocateFileReference(true, 'local', '/tmp/a.txt|/tmp/b.txt')).toBe(false)
  })
})

describe('复制还原：注册表按 model 还原占位为真实内容', () => {
  it('已注册：含 #YBIN_ 占位的选区文本被还原为真实标签', () => {
    const modelKey = {} // 用任意稳定对象模拟 monaco model
    const { text, entries } = collapseBinaryFuzztag(`prefix ${bigUnquoteTag} suffix`)
    registerBinaryFoldEntries(modelKey, entries)
    // 模拟复制选区拿到的是含占位的 model 文本
    expect(text).toContain('#YBIN_')
    const expanded = expandBinaryFuzztagByModelKey(modelKey, text)
    expect(expanded).not.toContain('#YBIN_')
    expect(expanded).toContain(bigUnquoteTag)
    unregisterBinaryFoldEntries(modelKey)
  })

  it('未注册或无占位：原样返回，不抛错', () => {
    const modelKey = {}
    expect(expandBinaryFuzztagByModelKey(modelKey, 'plain text')).toBe('plain text')
    // 未注册的 key 即使含占位也原样返回（拿不到映射）
    const { text } = collapseBinaryFuzztag(bigUnquoteTag)
    expect(expandBinaryFuzztagByModelKey(modelKey, text)).toBe(text)
    expect(expandBinaryFuzztagByModelKey(null, text)).toBe(text)
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

describe('goUnquotePreview', () => {
  it('预览头字节与全量解码头一致，并返回完整 byteLength', () => {
    const content = '"\\xff\\xd8\\x00A\\x01\\x02"'
    const full = goUnquoteToBytes(content)
    const { byteLength, preview } = goUnquotePreview(content, 4)
    expect(byteLength).toBe(full.length)
    expect(Array.from(preview)).toEqual(Array.from(full.slice(0, 4)))
  })

  it('中等体积：goUnquotePreview 全长统计与全量解码一致', () => {
    const hugeContent = '"' + '\\x50\\x4b\\x03\\x04'.repeat(5000) + '"'
    const full = goUnquoteToBytes(hugeContent)
    const { byteLength, preview } = goUnquotePreview(hugeContent, 4)
    expect(byteLength).toBe(full.length)
    expect(byteLength).toBe(5000 * 4)
    expect(Array.from(preview)).toEqual([0x50, 0x4b, 0x03, 0x04])
  })

  it('大体积 unquote：collapse 预览与全量解码头一致', () => {
    const hugeContent = '"' + '\\x50\\x4b\\x03\\x04'.repeat(5000) + '"'
    const full = goUnquoteToBytes(hugeContent)
    const { byteLength, preview } = goUnquotePreview(hugeContent, 4)
    expect(byteLength).toBe(full.length)

    const { entries } = collapseBinaryFuzztag(`{{unquote(${hugeContent})}}`)
    const entry = Array.from(entries.values())[0]
    expect(entry.byteLength).toBe(byteLength)
    expect(entry.previewHex).toBe(bytesToHex(preview))
  })
})

describe('buildChipLabel', () => {
  it('binary 小块包含字节数且不含普通空格(U+0020)', () => {
    const { entries } = collapseBinaryFuzztag(bigUnquoteTag)
    const entry = Array.from(entries.values())[0]
    const label = buildChipLabel(entry)
    expect(label).toMatch(/Binary\[.*\d+B/)
    // 提示用 U+00A0 拼接，不含普通空格，避免 renderWhitespace 圆点与折行
    expect(label).not.toContain(' ')
  })

  it('按类型显示 Binary / HexString / Base64 前缀', () => {
    const unquote = Array.from(collapseBinaryFuzztag(bigUnquoteTag).entries.values())[0]
    const hex = Array.from(collapseBinaryFuzztag(`{{hexdec(${'ab'.repeat(40)})}}`).entries.values())[0]
    const b64 = Array.from(collapseBinaryFuzztag(`{{base64decode(${'QUJD'.repeat(20)})}}`).entries.values())[0]
    expect(buildChipLabel(unquote)).toMatch(/^Binary\[/)
    expect(buildChipLabel(hex)).toMatch(/^HexString\[/)
    expect(buildChipLabel(b64)).toMatch(/^Base64\[/)
  })

  it('base64/hex 小块展示解码后的可读文本（如 Base64[asdf] / HexString[asdf]）', () => {
    // YXNkZg== -> asdf
    const b64 = Array.from(collapseBinaryFuzztag('{{base64d(YXNkZg==)}}').entries.values())[0]
    expect(b64.previewText).toBe('asdf')
    expect(buildChipLabel(b64)).toMatch(/^Base64\[asdf\]/)
    // 61736466 -> asdf
    const hex = Array.from(collapseBinaryFuzztag('{{hexd(61736466)}}').entries.values())[0]
    expect(hex.previewText).toBe('asdf')
    expect(buildChipLabel(hex)).toMatch(/^HexString\[asdf\]/)
  })

  it('base64/hex 内容不可打印时回退到 0x..NB 字节预览', () => {
    // 0x00 0x01 0x02 不可打印
    const hex = Array.from(collapseBinaryFuzztag(`{{hexd(000102${'ff'.repeat(40)})}}`).entries.values())[0]
    expect(hex.previewText).toBeUndefined()
    expect(buildChipLabel(hex)).toMatch(/^HexString\[0x[0-9a-f]+\.\.\d+B/)
  })

  it('小块末尾追加“Click to modify”点击提示(用 U+00A0 拼接)', () => {
    const entry = Array.from(collapseBinaryFuzztag(bigUnquoteTag).entries.values())[0]
    const label = buildChipLabel(entry)
    // 含提示词但不含普通空格
    expect(label).toContain('Click')
    expect(label).toContain('modify')
    expect(label).toContain('\u00A0')
    expect(label).not.toContain(' ')
    // 形如 Binary[...]\u00A0Click\u00A0to\u00A0modify
    expect(label.replace(/\u00A0/g, ' ')).toContain('Click to modify')
  })
})

describe('bytesToHex', () => {
  it('字节转 hex', () => {
    expect(bytesToHex(new Uint8Array([0, 255, 16]))).toBe('00ff10')
  })
})

describe('packetTextToRawBytes', () => {
  it('解码 unquote 后得到真实二进制字节', () => {
    const packet = 'POST / HTTP/1.1\r\n\r\n{{unquote("\\x09\\xe2\\x51\\x68")}}'
    const bytes = packetTextToRawBytes(packet)
    const prefix = new TextEncoder().encode('POST / HTTP/1.1\r\n\r\n')
    expect(Array.from(bytes.slice(0, prefix.length))).toEqual(Array.from(prefix))
    expect(Array.from(bytes.slice(prefix.length))).toEqual([0x09, 0xe2, 0x51, 0x68])
  })

  it('解码 hexdecode 标签', () => {
    expect(Array.from(packetTextToRawBytes('{{hexd(09e25168)}}'))).toEqual([0x09, 0xe2, 0x51, 0x68])
  })

  it('整包同步转换保留 file 引用，不把异步文件标签吞掉', () => {
    const packet = 'POST / HTTP/1.1\r\n\r\n{{file(/tmp/plain.txt)}}'
    expect(new TextDecoder().decode(packetTextToRawBytes(packet))).toBe(packet)
  })
})

describe('rawBytesToPacketText', () => {
  it('可打印 HTTP 包直接还原为文本', () => {
    const text = 'POST / HTTP/1.1\r\nHost: a\r\n\r\n{"a":1}'
    expect(rawBytesToPacketText(new TextEncoder().encode(text))).toBe(text)
  })

  it('二进制 body 写回为 unquote 标签', () => {
    const header = new TextEncoder().encode('POST / HTTP/1.1\r\n\r\n')
    const body = new Uint8Array([0x09, 0xe2, 0x51, 0x68])
    const bytes = new Uint8Array(header.length + body.length)
    bytes.set(header, 0)
    bytes.set(body, header.length)
    const packet = rawBytesToPacketText(bytes)
    expect(packet.startsWith('POST / HTTP/1.1\r\n\r\n{{unquote(')).toBe(true)
    expect(Array.from(packetTextToRawBytes(packet).slice(header.length))).toEqual([0x09, 0xe2, 0x51, 0x68])
  })

  it('bytesToUnquoteString 生成合法转义', () => {
    expect(bytesToUnquoteString(new Uint8Array([0x09, 0x22, 0xff]))).toBe('"\\t\\"\\xff"')
  })
})

describe('bytesToUnquoteString vs runCodec(StrQuote)', () => {
  for (const { name, bytes: byteList } of binaryQuoteCases) {
    it(`本地编码与 Codec StrQuote 一致: ${name}`, async () => {
      const bytes = new Uint8Array(byteList)
      const local = bytesToUnquoteString(bytes)
      const viaCodec = await strQuoteBytesViaCodec(bytes)
      const reference = referenceGoStrconvQuoteBytes(bytes)

      expect(local).toBe(viaCodec)
      expect(local).toBe(reference)
    })

    it(`双向 round-trip 一致: ${name}`, async () => {
      const bytes = new Uint8Array(byteList)
      const localQuoted = bytesToUnquoteString(bytes)
      const codecQuoted = await strQuoteBytesViaCodec(bytes)

      expect(bytesEqual(goUnquoteToBytes(localQuoted), bytes)).toBe(true)
      expect(bytesEqual(goUnquoteToBytes(codecQuoted), bytes)).toBe(true)
    })
  }

  it('大体积 unquote 内容与 Codec 路径一致', async () => {
    const bytes = goUnquoteToBytes(bigUnquoteContent)
    expect(bytesToUnquoteString(bytes)).toBe(await strQuoteBytesViaCodec(bytes))
  })

  it('MITM Binary chip 的 HEX 修改写回单层 unquote 并保持 0x11 字节语义', async () => {
    // 对应真实操作：打开 ZIP 的 Binary chip，将第一行覆盖为 0x11，再点击提交和放行。
    // 提交给 MITMv2 的文本只能有一层 \x11；若变成 \\x11，目标服务器收到的会是
    // 5c 78 31 31 四个 ASCII 字节，而不是一个 0x11。
    const original = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0xa5, 0xa5, 0xa5, 0xa5])
    const originalTag = `{{unquote(${bytesToUnquoteString(original)})}}`
    const collapsed = collapseBinaryFuzztag(originalTag)
    const entry = Array.from(collapsed.entries.values())[0]
    const edited = await decodeBinaryTag(entry)
    edited.fill(0x11, 0, 4)

    const editedTag = await encodeBytesToTag('unquote', 'unquote', edited)
    expect(editedTag).toContain('\\x11\\x11\\x11\\x11')
    expect(editedTag).not.toContain('\\\\x11')
    expect(Array.from(packetTextToRawBytes(editedTag))).toEqual([0x11, 0x11, 0x11, 0x11, 0xa5, 0xa5, 0xa5, 0xa5])

    const recollapsed = collapseBinaryFuzztag(editedTag)
    expect(expandBinaryFuzztag(recollapsed.text, recollapsed.entries)).toBe(editedTag)
  })

  it('unquote 编码必须转义 Fuzztag 语法分隔符', () => {
    // ZIP/PDF 等真实文件中经常出现 (){}。这些字节虽然是可打印 ASCII，
    // 但直接放进 {{unquote("...")}} 会被后端 Fuzztag parser 当成语法，
    // 导致 unquote handler 收到残缺参数，最终把 \xNN 文本当作文件发出。
    expect(bytesToUnquoteString(new Uint8Array([0x28, 0x29, 0x7b, 0x7d, 0x5c, 0x22]))).toBe(
      '"\\x28\\x29\\x7b\\x7d\\\\\\""',
    )
  })
})

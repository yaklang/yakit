// Web Fuzzer 二进制 Fuzztag 折叠：识别 / collapse / expand / 编解码
// 关键词: binary fuzztag fold, unquote, hexdecode, base64decode, placeholder

// 延迟获取 electron ipcRenderer，避免纯函数在非 electron 环境（如单测）导入即报错
const getIpcRenderer = (): any => (window as any).require('electron').ipcRenderer

// 超过该字节数（按标签内部参数文本长度估算）才折叠，避免打扰短标签
export const BINARY_FOLD_THRESHOLD = 64

// 占位标记前后缀，确保唯一且为纯 ASCII，便于 expand 时精确回填
const PLACEHOLDER_PREFIX = '#YBIN_'
const PLACEHOLDER_SUFFIX = '#'

export type BinaryTagKind = 'unquote' | 'hex' | 'base64' | 'file'

export interface BinaryFuzztagEntry {
  id: string
  // 原始标签名（含别名，如 unquote / hexdec / base64decode）
  tagName: string
  kind: BinaryTagKind
  editable: boolean
  // 完整原始标签文本（含 {{ }}），expand 时原样回填
  originalTagText: string
  // 标签参数文本（括号内内容），用于解码
  innerContent: string
  // 预览信息
  byteLength: number
  previewHex: string
}

export interface BinaryCollapseResult {
  text: string
  entries: Map<string, BinaryFuzztagEntry>
}

// 标签名 -> 类型映射（含别名）
const TAG_NAME_KIND: Record<string, BinaryTagKind> = {
  unquote: 'unquote',
  hexdec: 'hex',
  hexd: 'hex',
  hexdecode: 'hex',
  base64dec: 'base64',
  base64d: 'base64',
  b64d: 'base64',
  base64decode: 'base64',
  file: 'file',
}

const isEditableKind = (kind: BinaryTagKind): boolean => kind !== 'file'

// 确定性 hash（cyrb53），保证 collapse(expand(x)) === x，避免受控组件覆盖死循环
const hashId = (str: string): string => {
  let h1 = 0xdeadbeef
  let h2 = 0x41c6ce57
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i)
    h1 = Math.imul(h1 ^ ch, 2654435761)
    h2 = Math.imul(h2 ^ ch, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  return (h2 >>> 0).toString(16).padStart(8, '0') + (h1 >>> 0).toString(16).padStart(8, '0')
}

// 预览信息缓存：key 为 id，避免每次按键都重新扫描大块内容
const previewCache = new Map<string, { byteLength: number; previewHex: string }>()

// 编辑改动信息：key 为占位 id（内容 hash），记录相对原始内容的增删改字节数
export interface BinaryChangeInfo {
  addedCount: number
  overriddenCount: number
  removedCount: number
}
const changeInfoMap = new Map<string, BinaryChangeInfo>()
export const getBinaryChangeInfo = (id: string): BinaryChangeInfo | undefined => changeInfoMap.get(id)
export const setBinaryChangeInfo = (id: string, info: BinaryChangeInfo): void => {
  changeInfoMap.set(id, info)
}

const buildPlaceholder = (tagName: string, id: string): string =>
  `{{${tagName}(${PLACEHOLDER_PREFIX}${id}${PLACEHOLDER_SUFFIX})}}`

// 按标签类型的健壮匹配：
// - unquote 参数为带转义的双引号串，用 "(?:\\.|[^"\\])*" 精确匹配，二进制内含 }} / { / ( 也不会误判
// - hex/base64 参数为受限字符集，内容不可能含 )}}，安全
// - file 参数禁止 ) { } 以避免越界
const buildTagRegex = (): RegExp =>
  /\{\{(unquote)\(("(?:\\.|[^"\\])*")\)\}\}|\{\{(hexdec|hexd|hexdecode)\(([0-9a-fA-F\s]+)\)\}\}|\{\{(base64dec|base64d|b64d|base64decode)\(([A-Za-z0-9+/=\s]+)\)\}\}|\{\{(file)\(([^){}]*)\)\}\}/g

const matchToNameContent = (m: RegExpExecArray): { tagName: string; content: string } | null => {
  if (m[1] !== undefined) {
    return { tagName: m[1], content: m[2] }
  }
  if (m[3] !== undefined) {
    return { tagName: m[3], content: m[4] }
  }
  if (m[5] !== undefined) {
    return { tagName: m[5], content: m[6] }
  }
  if (m[7] !== undefined) {
    return { tagName: m[7], content: m[8] }
  }
  return null
}

// 计算预览（byteLength + 前若干字节 hex），带缓存
const computePreview = (
  kind: BinaryTagKind,
  content: string,
  id: string,
): { byteLength: number; previewHex: string } => {
  const cached = previewCache.get(id)
  if (cached) {
    return cached
  }
  let result = { byteLength: content.length, previewHex: '' }
  try {
    if (kind === 'hex') {
      const stripped = content.replace(/\s+/g, '')
      result = { byteLength: Math.floor(stripped.length / 2), previewHex: stripped.slice(0, 8).toLowerCase() }
    } else if (kind === 'base64') {
      const stripped = content.replace(/\s+/g, '')
      const padLen = (stripped.match(/=+$/) || [''])[0].length
      const byteLength = Math.max(0, Math.floor((stripped.length * 3) / 4) - padLen)
      let previewHex = ''
      try {
        const head = stripped.slice(0, 12).replace(/=+$/, '')
        const bin = atob(head)
        previewHex = bytesToHex(strToByteArray(bin)).slice(0, 8)
      } catch (e) {}
      result = { byteLength, previewHex }
    } else if (kind === 'unquote') {
      const bytes = goUnquoteToBytes(content)
      result = { byteLength: bytes.length, previewHex: bytesToHex(bytes.slice(0, 4)) }
    } else if (kind === 'file') {
      result = { byteLength: content.length, previewHex: '' }
    }
  } catch (e) {}
  previewCache.set(id, result)
  return result
}

// 折叠：真实文本 -> 占位文本 + 侧表
export const collapseBinaryFuzztag = (raw: string): BinaryCollapseResult => {
  const entries = new Map<string, BinaryFuzztagEntry>()
  if (!raw || raw.indexOf('{{') < 0) {
    return { text: raw, entries }
  }
  const reg = buildTagRegex()
  let out = ''
  let pre = 0
  let m: RegExpExecArray | null
  while ((m = reg.exec(raw)) !== null) {
    const nc = matchToNameContent(m)
    if (!nc) {
      continue
    }
    const kind = TAG_NAME_KIND[nc.tagName.toLowerCase()]
    if (!kind) {
      continue
    }
    // 阈值过滤（参数文本长度）；不折叠的标签保留在后续 slice 中
    if (nc.content.length <= BINARY_FOLD_THRESHOLD) {
      continue
    }
    const originalTagText = m[0]
    const id = hashId(originalTagText)
    const preview = computePreview(kind, nc.content, id)
    entries.set(id, {
      id,
      tagName: nc.tagName,
      kind,
      editable: isEditableKind(kind),
      originalTagText,
      innerContent: nc.content,
      byteLength: preview.byteLength,
      previewHex: preview.previewHex,
    })
    out += raw.slice(pre, m.index)
    out += buildPlaceholder(nc.tagName, id)
    pre = m.index + m[0].length
  }
  out += raw.slice(pre)
  return { text: out, entries }
}

const placeholderRegex = () => /\{\{([\w:]+)\(#YBIN_([0-9a-f]+)#\)\}\}/g

// 展开：占位文本 -> 真实文本
export const expandBinaryFuzztag = (text: string, entries: Map<string, BinaryFuzztagEntry>): string => {
  if (!text || text.indexOf(PLACEHOLDER_PREFIX) < 0) {
    return text
  }
  return text.replace(placeholderRegex(), (match, _name, id) => {
    const entry = entries.get(id)
    return entry ? entry.originalTagText : match
  })
}

export interface PlaceholderOffset {
  id: string
  start: number
  end: number
}

// 在文本中定位所有占位（字符偏移）
export const findPlaceholderOffsets = (text: string): PlaceholderOffset[] => {
  const res: PlaceholderOffset[] = []
  if (!text || text.indexOf(PLACEHOLDER_PREFIX) < 0) {
    return res
  }
  const reg = placeholderRegex()
  let m: RegExpExecArray | null
  while ((m = reg.exec(text)) !== null) {
    res.push({ id: m[2], start: m.index, end: m.index + m[0].length })
  }
  return res
}

// 生成小块展示文案：编辑后仍保持 Binary[xxx] 外观，并追加 Changed:add/override 标注
// 注意：editor 开启 renderWhitespace:'all'，标签内的空格会被渲染成 middot 圆点，
// 故此处刻意不使用空格（用 _ . / 等连接），同时避免空格成为换行点导致小块折行。
export const buildChipLabel = (entry: BinaryFuzztagEntry): string => {
  if (entry.kind === 'file') {
    const base = entry.innerContent.split(/[\\/]/).pop() || entry.innerContent
    return `File[${truncateMiddle(base, 32).replace(/\s+/g, '_')}]`
  }
  const head = entry.previewHex ? `0x${entry.previewHex}..` : ''
  let inner = `${head}${entry.byteLength}B`
  const change = changeInfoMap.get(entry.id)
  if (change) {
    const parts: string[] = []
    if (change.addedCount > 0) {
      parts.push(`+${change.addedCount}add`)
    }
    if (change.overriddenCount > 0) {
      parts.push(`~${change.overriddenCount}override`)
    }
    if (change.removedCount > 0) {
      parts.push(`-${change.removedCount}del`)
    }
    inner += parts.length > 0 ? `|Changed:${parts.join('/')}` : '|Changed'
  }
  return `Binary[${inner}]`
}

// 判断某占位是否被编辑过（用于装饰样式切换）
export const isBinaryChanged = (id: string): boolean => changeInfoMap.has(id)

const truncateMiddle = (s: string, max: number): string => {
  if (s.length <= max) {
    return s
  }
  const half = Math.floor((max - 2) / 2)
  return `${s.slice(0, half)}..${s.slice(s.length - half)}`
}

// ----- 字节工具 -----
export const bytesToHex = (bytes: Uint8Array | number[]): string => {
  let s = ''
  for (let i = 0; i < bytes.length; i++) {
    s += (bytes[i] & 0xff).toString(16).padStart(2, '0')
  }
  return s
}

const strToByteArray = (s: string): number[] => {
  const arr: number[] = []
  for (let i = 0; i < s.length; i++) {
    arr.push(s.charCodeAt(i) & 0xff)
  }
  return arr
}

// Go strconv.Unquote 语义的 JS 近似实现（仅用于预览/兜底），返回字节
export const goUnquoteToBytes = (input: string): Uint8Array => {
  let s = input
  if (s.length >= 2 && s[0] === '"' && s[s.length - 1] === '"') {
    s = s.slice(1, s.length - 1)
  }
  const bytes: number[] = []
  const encoder = new TextEncoder()
  let literal = ''
  const flushLiteral = () => {
    if (literal.length > 0) {
      const enc = encoder.encode(literal)
      for (let k = 0; k < enc.length; k++) {
        bytes.push(enc[k])
      }
      literal = ''
    }
  }
  const pushRune = (codePoint: number) => {
    const enc = encoder.encode(String.fromCodePoint(codePoint))
    for (let k = 0; k < enc.length; k++) {
      bytes.push(enc[k])
    }
  }
  let i = 0
  const n = s.length
  while (i < n) {
    const c = s[i]
    if (c !== '\\') {
      literal += c
      i++
      continue
    }
    flushLiteral()
    i++
    if (i >= n) {
      break
    }
    const e = s[i]
    switch (e) {
      case 'a':
        bytes.push(7)
        i++
        break
      case 'b':
        bytes.push(8)
        i++
        break
      case 'f':
        bytes.push(12)
        i++
        break
      case 'n':
        bytes.push(10)
        i++
        break
      case 'r':
        bytes.push(13)
        i++
        break
      case 't':
        bytes.push(9)
        i++
        break
      case 'v':
        bytes.push(11)
        i++
        break
      case '\\':
        bytes.push(92)
        i++
        break
      case '"':
        bytes.push(34)
        i++
        break
      case "'":
        bytes.push(39)
        i++
        break
      case 'x': {
        const hex = s.slice(i + 1, i + 3)
        bytes.push(parseInt(hex, 16) & 0xff)
        i += 3
        break
      }
      case 'u': {
        const hex = s.slice(i + 1, i + 5)
        pushRune(parseInt(hex, 16))
        i += 5
        break
      }
      case 'U': {
        const hex = s.slice(i + 1, i + 9)
        pushRune(parseInt(hex, 16))
        i += 9
        break
      }
      default: {
        if (e >= '0' && e <= '7') {
          const oct = s.slice(i, i + 3)
          bytes.push(parseInt(oct, 8) & 0xff)
          i += 3
        } else {
          literal += e
          i++
        }
      }
    }
  }
  flushLiteral()
  return new Uint8Array(bytes)
}

// ----- 后端编解码（精确字节）-----
interface CodecWorkItem {
  CodecType: string
  Params: { Key: string; Value: string }[]
}

interface CodecResponse {
  Result: string
  RawResult: Uint8Array
}

const runCodec = (text: string, workflow: CodecWorkItem[]): Promise<CodecResponse> =>
  getIpcRenderer().invoke('NewCodec', { Text: text, WorkFlow: workflow })

const decodeWorkflowOf = (kind: BinaryTagKind): CodecWorkItem[] => {
  switch (kind) {
    case 'unquote':
      return [{ CodecType: 'StrUnQuote', Params: [] }]
    case 'hex':
      return [{ CodecType: 'HexDecode', Params: [] }]
    case 'base64':
      return [{ CodecType: 'Base64Decode', Params: [{ Key: 'Alphabet', Value: 'standard' }] }]
    default:
      return []
  }
}

// 标签内容 -> 精确字节（用于 HEX 编辑器）
export const decodeBinaryTag = async (entry: BinaryFuzztagEntry): Promise<Uint8Array> => {
  try {
    const rsp = await runCodec(entry.innerContent, decodeWorkflowOf(entry.kind))
    if (rsp && rsp.RawResult) {
      return new Uint8Array(rsp.RawResult)
    }
  } catch (e) {
    // unquote 兜底：内容未带引号时补引号重试
    if (entry.kind === 'unquote') {
      try {
        const rsp = await runCodec(`"${entry.innerContent}"`, decodeWorkflowOf('unquote'))
        if (rsp && rsp.RawResult) {
          return new Uint8Array(rsp.RawResult)
        }
      } catch (e2) {}
    }
  }
  // 最终兜底：本地解码
  if (entry.kind === 'unquote') {
    return goUnquoteToBytes(entry.innerContent)
  }
  return new Uint8Array()
}

// 字节 -> 完整标签文本（按原标签类型重新编码）
export const encodeBytesToTag = async (kind: BinaryTagKind, tagName: string, bytes: Uint8Array): Promise<string> => {
  const hex = bytesToHex(bytes)
  if (kind === 'hex') {
    return `{{${tagName}(${hex})}}`
  }
  if (kind === 'unquote') {
    const rsp = await runCodec(hex, [
      { CodecType: 'HexDecode', Params: [] },
      { CodecType: 'StrQuote', Params: [] },
    ])
    return `{{${tagName}(${rsp.Result})}}`
  }
  if (kind === 'base64') {
    const rsp = await runCodec(hex, [
      { CodecType: 'HexDecode', Params: [] },
      { CodecType: 'Base64Encode', Params: [{ Key: 'Alphabet', Value: 'standard' }] },
    ])
    return `{{${tagName}(${rsp.Result})}}`
  }
  return `{{${tagName}(${hex})}}`
}

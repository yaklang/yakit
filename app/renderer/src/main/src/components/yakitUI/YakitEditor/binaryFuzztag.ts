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
  // 解码后的可读文本预览（仅 base64/hex 且内容可打印时存在），用于小块展示 Base64[asdf] 这类直观文案
  previewText?: string
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

// 预览信息缓存：key 为 id，避免每次按键都重新扫描大块内容；限制上限避免长会话内存膨胀
const MAX_PREVIEW_CACHE_SIZE = 1000
const previewCache = new Map<string, { byteLength: number; previewHex: string; previewText?: string }>()

const rememberPreview = (id: string, value: { byteLength: number; previewHex: string; previewText?: string }): void => {
  previewCache.delete(id)
  previewCache.set(id, value)
  while (previewCache.size > MAX_PREVIEW_CACHE_SIZE) {
    const oldest = previewCache.keys().next().value
    if (oldest === undefined) {
      break
    }
    previewCache.delete(oldest)
  }
}

// 字节 -> 可读文本：仅当解码为合法 UTF-8 且不含不可见控制符(允许 \t \n \r)时返回，否则返回 undefined
// 用于 base64/hex 小块直观展示解码内容（如 Base64[asdf]）；二进制内容则回退到 0x..NB 字节预览
const bytesToDisplayText = (bytes: Uint8Array): string | undefined => {
  if (!bytes || bytes.length === 0) {
    return undefined
  }
  try {
    const text = new TextDecoder('utf-8', { fatal: false }).decode(bytes)
    if (text.length === 0) {
      return undefined
    }
    // U+FFFD 表示非法 UTF-8 序列
    if (text.indexOf('\uFFFD') >= 0) {
      return undefined
    }
    // 含不可见控制符（除 \t \n \r 外）则视为二进制，不做文本预览
    if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(text)) {
      return undefined
    }
    return text
  } catch (e) {
    return undefined
  }
}

// hex 字符串 -> 字节（仅取前若干字符用于预览）
const hexHeadToBytes = (hex: string, maxChars: number): Uint8Array => {
  const stripped = hex.replace(/\s+/g, '')
  const head = stripped.slice(0, maxChars - (maxChars % 2))
  const n = Math.floor(head.length / 2)
  const out = new Uint8Array(n)
  for (let i = 0; i < n; i++) {
    out[i] = parseInt(head.substr(i * 2, 2), 16) & 0xff
  }
  return out
}

// 占位还原注册表：key 为 monaco model（或任意稳定对象），value 为该编辑器的 占位id -> 标签信息 映射。
// 目的：让所有"读取 model 文本去复制/导出"的路径（DOM copy 事件、右键自定义复制、fetchCursorContent 等）
// 都能把 {{tag(#YBIN_id#)}} 占位还原成真实内容，保证复制粘贴出去的永远是真实标签而非内部占位。
const modelEntriesRegistry = new WeakMap<object, Map<string, BinaryFuzztagEntry>>()
export const registerBinaryFoldEntries = (modelKey: object, entries: Map<string, BinaryFuzztagEntry>): void => {
  if (modelKey) {
    modelEntriesRegistry.set(modelKey, entries)
  }
}
export const unregisterBinaryFoldEntries = (modelKey: object): void => {
  if (modelKey) {
    modelEntriesRegistry.delete(modelKey)
  }
}
// 用注册表把文本里的占位还原为真实标签；无注册或无占位则原样返回。供 editorUtils 等外部模块复用。
export const expandBinaryFuzztagByModelKey = (modelKey: object | null | undefined, text: string): string => {
  if (!modelKey || !text || text.indexOf(PLACEHOLDER_PREFIX) < 0) {
    return text
  }
  const entries = modelEntriesRegistry.get(modelKey)
  if (!entries) {
    return text
  }
  return expandBinaryFuzztag(text, entries)
}

const buildPlaceholder = (tagName: string, id: string): string =>
  `{{${tagName}(${PLACEHOLDER_PREFIX}${id}${PLACEHOLDER_SUFFIX})}}`

/**
 * 从 `{{` 开始解析标签，返回标签名、括号内内容及结束位置
 * @param raw 原始字符串
 * @param start 指向 `{{` 的索引
 * @returns 解析结果或 null
 */
function parseTag(raw: string, start: number): { tagName: string; content: string; endIndex: number } | null {
  const afterOpen = start + 2
  const parenIdx = raw.indexOf('(', afterOpen)
  if (parenIdx === -1) return null

  const tagName = raw.slice(afterOpen, parenIdx).trim()
  if (!tagName) return null

  const lower = tagName.toLowerCase()
  const kind = TAG_NAME_KIND[lower]
  if (!kind) return null // 未知标签

  // 根据 kind 决定解析方式
  if (kind === 'unquote') {
    return parseUnquoteTag(raw, parenIdx, tagName)
  } else {
    // hex / base64 / file 都使用简单解析
    return parseSimpleTag(raw, parenIdx, tagName)
  }
}

/**
 * 解析普通标签（hex/base64/file），内容不含 `)` 和 `}}`
 */
function parseSimpleTag(
  raw: string,
  parenIdx: number,
  tagName: string,
): { tagName: string; content: string; endIndex: number } | null {
  const start = parenIdx + 1
  const closeParen = raw.indexOf(')', start)
  if (closeParen === -1) return null

  // 必须紧跟 `}}`
  if (!raw.startsWith('}}', closeParen + 1)) return null

  const endIndex = closeParen + 3 // 跳过 `)}}`
  const content = raw.slice(start, closeParen).trim() // 去掉首尾空白（可选）
  return { tagName, content, endIndex }
}

/**
 * 解析 unquote 标签，正确处理双引号字符串（支持转义）
 */
function parseUnquoteTag(
  raw: string,
  parenIdx: number,
  tagName: string,
): { tagName: string; content: string; endIndex: number } | null {
  const start = parenIdx + 1
  if (start >= raw.length || raw[start] !== '"') return null

  // 找到匹配的未转义双引号
  const closeQuote = findMatchingQuote(raw, start)
  if (closeQuote === -1) return null

  const afterQuote = closeQuote + 1
  // 必须紧跟 `)}}`
  if (raw[afterQuote] !== ')') return null
  if (!raw.startsWith('}}', afterQuote + 1)) return null

  const endIndex = afterQuote + 3 // 跳过 `)}}`
  const content = raw.slice(start, closeQuote + 1) // 包含两端引号
  return { tagName, content, endIndex }
}

/**
 * 在 raw 中从 start 位置（指向第一个引号）开始，寻找匹配的未转义双引号
 */
function findMatchingQuote(raw: string, start: number): number {
  let pos = start + 1
  while (pos < raw.length) {
    if (raw[pos] === '\\' && pos + 1 < raw.length) {
      pos += 2 // 跳过转义字符和后面的字符
    } else if (raw[pos] === '"') {
      return pos // 找到匹配的引号
    } else {
      pos++
    }
  }
  return -1
}

// 计算预览（byteLength + 前若干字节 hex），带缓存
const computePreview = (
  kind: BinaryTagKind,
  content: string,
  id: string,
): { byteLength: number; previewHex: string; previewText?: string } => {
  const cached = previewCache.get(id)
  if (cached) {
    rememberPreview(id, cached)
    return cached
  }
  let result: { byteLength: number; previewHex: string; previewText?: string } = {
    byteLength: content.length,
    previewHex: '',
  }
  try {
    if (kind === 'hex') {
      const stripped = content.replace(/\s+/g, '')
      const headBytes = hexHeadToBytes(stripped, 96)
      result = {
        byteLength: Math.floor(stripped.length / 2),
        previewHex: stripped.slice(0, 8).toLowerCase(),
        previewText: bytesToDisplayText(headBytes),
      }
    } else if (kind === 'base64') {
      const stripped = content.replace(/\s+/g, '')
      const padLen = (stripped.match(/=+$/) || [''])[0].length
      const byteLength = Math.max(0, Math.floor((stripped.length * 3) / 4) - padLen)
      let previewHex = ''
      let previewText: string | undefined
      try {
        // 仅解码前若干 base64 字符用于预览，避免大内容全量解码
        const headLen = Math.min(stripped.length, 64)
        const head = stripped.slice(0, headLen - (headLen % 4))
        const bin = atob(head)
        const bytes = Uint8Array.from(strToByteArray(bin))
        previewHex = bytesToHex(bytes.slice(0, 4))
        previewText = bytesToDisplayText(bytes)
      } catch (e) {}
      result = { byteLength, previewHex, previewText }
    } else if (kind === 'unquote') {
      const bytes = goUnquoteToBytes(content)
      result = { byteLength: bytes.length, previewHex: bytesToHex(bytes.slice(0, 4)) }
    } else if (kind === 'file') {
      result = { byteLength: content.length, previewHex: '' }
    }
  } catch (e) {}
  rememberPreview(id, result)
  return result
}

// 折叠：真实文本 -> 占位文本 + 侧表
export const collapseBinaryFuzztag = (raw: string): BinaryCollapseResult => {
  const entries = new Map<string, BinaryFuzztagEntry>()
  if (!raw || !raw.includes('{{')) {
    return { text: raw, entries }
  }

  const resultParts: string[] = []
  let i = 0
  const len = raw.length

  while (i < len) {
    const openIdx = raw.indexOf('{{', i)
    if (openIdx === -1) {
      resultParts.push(raw.slice(i))
      break
    }

    // 保留 `{{` 之前的普通文本
    resultParts.push(raw.slice(i, openIdx))

    // 尝试解析标签
    const parsed = parseTag(raw, openIdx)
    if (!parsed) {
      // 无法解析，保留原 `{{` 作为普通文本
      resultParts.push(raw.slice(openIdx, openIdx + 2))
      i = openIdx + 2
      continue
    }

    const { tagName, content, endIndex } = parsed
    const fullTag = raw.slice(openIdx, endIndex)
    const kind = TAG_NAME_KIND[tagName.toLowerCase()]
    if (!kind) {
      // 未知标签类型，保留原样
      resultParts.push(fullTag)
      i = endIndex
      continue
    }

    // 折叠策略：file 短内容不折叠
    if (kind === 'file' && content.length <= BINARY_FOLD_THRESHOLD) {
      resultParts.push(fullTag)
      i = endIndex
      continue
    }

    // 折叠：生成占位符
    const id = hashId(fullTag)
    const preview = computePreview(kind, content, id)
    const entry: BinaryFuzztagEntry = {
      id,
      tagName,
      kind,
      editable: isEditableKind(kind),
      originalTagText: fullTag,
      innerContent: content,
      byteLength: preview.byteLength,
      previewHex: preview.previewHex,
      previewText: preview.previewText,
    }
    entries.set(id, entry)
    resultParts.push(buildPlaceholder(tagName, id))

    i = endIndex
  }

  return { text: resultParts.join(''), entries }
}

/**
 * 将含二进制 Fuzztag 的请求/响应文本解码为真实字节，供 HEX 视图使用。
 * unquote / hexdecode / base64decode 会解码；file 与普通文本按 UTF-8 保留。
 */
export const packetTextToRawBytes = (raw: string): Uint8Array => {
  if (!raw) {
    return new Uint8Array()
  }

  const chunks: Uint8Array[] = []
  const pushText = (s: string) => {
    if (s) {
      chunks.push(new TextEncoder().encode(s))
    }
  }
  const pushBytes = (bytes: Uint8Array) => {
    if (bytes.length) {
      chunks.push(bytes)
    }
  }

  let i = 0
  const len = raw.length
  while (i < len) {
    const openIdx = raw.indexOf('{{', i)
    if (openIdx === -1) {
      pushText(raw.slice(i))
      break
    }
    pushText(raw.slice(i, openIdx))

    // 是否二进制标签以 parseTag 为准；普通 {{ 或未知标签按原文 UTF-8 保留
    const parsed = parseTag(raw, openIdx)
    if (!parsed) {
      pushText(raw.slice(openIdx, openIdx + 2))
      i = openIdx + 2
      continue
    }

    const { tagName, content, endIndex } = parsed
    const fullTag = raw.slice(openIdx, endIndex)
    const kind = TAG_NAME_KIND[tagName.toLowerCase()]
    if (!kind || kind === 'file') {
      pushText(fullTag)
      i = endIndex
      continue
    }

    if (kind === 'unquote') {
      pushBytes(goUnquoteToBytes(content))
    } else if (kind === 'hex') {
      const stripped = content.replace(/\s+/g, '')
      pushBytes(hexHeadToBytes(stripped, stripped.length))
    } else if (kind === 'base64') {
      try {
        const stripped = content.replace(/\s+/g, '')
        pushBytes(Uint8Array.from(strToByteArray(atob(stripped))))
      } catch (e) {
        pushText(fullTag)
      }
    }
    i = endIndex
  }

  let total = 0
  for (const c of chunks) {
    total += c.length
  }
  const out = new Uint8Array(total)
  let offset = 0
  for (const c of chunks) {
    out.set(c, offset)
    offset += c.length
  }
  return out
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

// 小块类型前缀：按解码语义区分三类可编辑标签 + 只读文件引用
// unquote -> Binary, hexdecode -> HexString, base64decode -> Base64, file -> File
const KIND_CHIP_PREFIX: Record<BinaryTagKind, string> = {
  unquote: 'Binary',
  hex: 'HexString',
  base64: 'Base64',
  file: 'File',
}

// 不间断空格(U+00A0)：editor 开启 renderWhitespace:'all' 只会把普通空格(U+0020)/Tab 渲染成
// middot 圆点，U+00A0 不会被渲染成圆点；用它拼接“点击修改”提示，既能正常显示空格分词，
// 又不出现圆点、也不会成为换行点导致小块折行。
const NBSP = '\u00A0'
// 提示用户该小块可点击编辑/查看。英文文案：Click to modify / Click to view
const CLICK_HINT_EDIT = `${NBSP}Click${NBSP}to${NBSP}modify`
const CLICK_HINT_VIEW = `${NBSP}Click${NBSP}to${NBSP}view`

// 小块内文本净化：换行/Tab 转义为可见转义符，普通空格转 U+00A0，避免 renderWhitespace 圆点与折行
const sanitizeChipText = (s: string): string =>
  s.replace(/\r/g, '\\r').replace(/\n/g, '\\n').replace(/\t/g, '\\t').replace(/ /g, NBSP)

// 生成小块展示文案：按类型显示 Binary/HexString/Base64/File[xxx]，
// changed 为 true 时仅追加 "|Changed"（只记是否被修改，不写增删改细节），末尾追加“点击修改/查看”提示。
// changed 由调用方按"编辑器中第 N 个标签是否被改过"决定，与内容无关，保证复制出去的永远是纯内容。
// 注意：除提示中的 U+00A0 外不使用普通空格（避免 renderWhitespace 圆点与折行）。
export const buildChipLabel = (entry: BinaryFuzztagEntry, changed = false): string => {
  if (entry.kind === 'file') {
    const base = entry.innerContent.split(/[\\/]/).pop() || entry.innerContent
    return `File[${truncateMiddle(base, 32).replace(/\s+/g, '_')}]${CLICK_HINT_VIEW}`
  }
  // base64/hex 优先展示解码后的可读文本（如 Base64[asdf]）；不可打印的二进制内容回退到 0x..NB 字节预览
  let inner: string
  if ((entry.kind === 'base64' || entry.kind === 'hex') && entry.previewText) {
    inner = sanitizeChipText(truncateMiddle(entry.previewText, 24))
  } else {
    const head = entry.previewHex ? `0x${entry.previewHex}..` : ''
    inner = `${head}${entry.byteLength}B`
  }
  if (changed) {
    inner += '|Changed'
  }
  return `${KIND_CHIP_PREFIX[entry.kind]}[${inner}]${CLICK_HINT_EDIT}`
}

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

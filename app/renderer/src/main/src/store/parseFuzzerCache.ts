import { debugToPrintLogs } from '@/utils/logCollection'

/**
 * 安全解析 Web Fuzzer 标签页缓存。
 * 先尝试直接解析，若失败则尝试修复截断的字符串字段后再解析。
 * 修复策略：丢弃损坏字段及其后的所有内容，保留前面的完整数据，缺失字段由页面默认值填充。
 *
 * @param raw - 原始缓存字符串（JSON 数组格式）
 * @returns 解析后的标签页对象数组
 * @throws 如果修复后仍无法解析，抛出原始 JSON 解析错误
 */
export const safeParseFuzzerCache = (raw: string): any[] => {
  try {
    return parseCache(raw)
  } catch (error) {
    try {
      return parseCache(replaceBrokenTabStrings(raw))
    } catch (repairError) {
      debugToPrintLogs({
        page: 'MainOperatorContent',
        fun: 'safeParseFuzzerCache',
        status: 'ERRO',
        title: 'Web Fuzzer 缓存解析失败且截断修复未成功，抛出原始解析错误',
        content: { originalError: `${error}`, repairError: `${repairError}` },
      })
      throw error
    }
  }
}

/**
 * 递归解析 JSON 字符串，若解析结果为字符串则再次解析（处理双重编码）。
 *
 * @param raw - JSON 字符串
 * @returns 解析后的对象/数组
 */
const parseCache = (raw: string): any[] => {
  const parsed = JSON.parse(raw || '[]')
  if (typeof parsed === 'string') return parseCache(parsed)
  return parsed
}

/**
 * 尝试修复每个标签页片段中被截断的字符串字段。
 * 对每个片段尝试解析，若失败则调用修复逻辑，丢弃损坏字段及其后内容。
 *
 * @param raw - 原始缓存数组字符串
 * @returns 修复后的完整 JSON 数组字符串
 */
const replaceBrokenTabStrings = (raw: string): string => {
  const tabs = splitTabsRobust(raw).map((segment, index) => {
    try {
      JSON.parse(segment)
      return segment
    } catch {
      const { text, field } = repairBrokenTab(segment, index)
      const tabId = /"id"\s*:\s*"([^"]*)"/.exec(segment)?.[1] || ''
      const verbose = /"verbose"\s*:\s*"([^"]*)"/.exec(segment)?.[1] || ''
      const tabLabel = [tabId, verbose].filter(Boolean).join(' / ')
      debugToPrintLogs({
        page: 'MainOperatorContent',
        fun: 'safeParseFuzzerCache',
        status: 'WARN',
        title: `Web Fuzzer 第 ${index + 1} 个 tab${tabLabel ? `(${tabLabel})` : ''} ${field}因缓存截断不完整已丢弃，打开后该字段及其后缺失项走页面默认值`,
        content: { index: index + 1, id: tabId, verbose, field },
      })
      return text
    }
  })
  return `[${tabs.join(',')}]`
}

/**
 * 切分缓存数组中的每个顶层对象片段。
 * 不依赖特定字段顺序，通过统计大括号 `{}` 的嵌套层级来定位每个顶层对象。
 * 支持嵌套对象和截断场景（最后一个未闭合的对象也会被保留）。
 *
 * 末尾的 `]` 按外层数组结束符剥掉。截断若落在 params / extractors / matchers / proxy 等嵌套数组上，
 * 这个 `]` 可能其实是内层括号，字符串修复对不上就会失败；接受这种边界，抛原始错误让用户手动恢复标签页。
 *
 * @param raw - 原始缓存字符串（应为一个 JSON 数组）
 * @returns 每个顶层对象的字符串片段（包含大括号）的数组
 * @throws 如果输入不是数组或找不到任何顶层对象
 */
const splitTabsRobust = (raw: string): string[] => {
  const body = (raw || '').trim()
  if (!body.startsWith('[')) throw new Error('not array')

  // 假定末尾 ] 是外层数组的；嵌套数组截断时可能剥错，修失败则外抛
  const inner = body.slice(1).replace(/]\s*$/, '')

  const segments: string[] = []
  let depth = 0
  let start = -1
  let inString = false
  let escaped = false

  for (let i = 0; i < inner.length; i++) {
    const ch = inner[i]

    if (escaped) {
      escaped = false
      continue
    }
    if (ch === '\\') {
      escaped = true
      continue
    }
    if (ch === '"') {
      inString = !inString
      continue
    }
    if (inString) continue

    if (ch === '{') {
      if (depth === 0) start = i
      depth++
    } else if (ch === '}') {
      depth--
      if (depth === 0 && start !== -1) {
        segments.push(inner.slice(start, i + 1).trim())
        start = -1
      }
    }
  }

  if (start !== -1) {
    segments.push(inner.slice(start).trim())
  }

  if (segments.length === 0) {
    throw new Error('no tab')
  }
  return segments
}

/**
 * 修复单个标签页片段：定位损坏的字符串字段起始索引，并调用 `removeFromIndex` 截断。
 *
 * @param segment - 单个标签页对象的字符串片段
 * @param index - 该片段在数组中的索引（从0开始），用于补充默认值
 * @returns 包含修复后的文本片段和损坏字段名的对象
 * @throws 如果未找到损坏的字符串字段（返回 -1），则抛出错误
 */
const repairBrokenTab = (segment: string, index: number): { text: string; field: string } => {
  const idx = findBrokenStringKeyIndex(segment)
  if (idx < 0) throw new Error('no truncated string')
  const field = /^"([^"]*)"/.exec(segment.slice(idx))?.[1] || ''
  return { text: removeFromIndex(segment, index, idx), field }
}

/**
 * 从损坏字段的键名起始处截断，丢弃该字段及其后的所有内容。
 * 保留前面的完整数据，补全缺失的括号，并为 `verbose` 和 `sortFieId` 补充默认值。
 *
 * @param segment - 原始标签页片段
 * @param index - 当前标签页索引（从0开始）
 * @param idx - 损坏字段键名的起始索引（指向开头的双引号）
 * @returns 修复后且可解析的 JSON 字符串
 */
const removeFromIndex = (segment: string, index: number, idx: number): string => {
  const prefix = segment.slice(0, idx).replace(/,\s*$/, '')
  const fixed = closeBrackets(prefix)
  const parsed = JSON.parse(fixed)

  if (!parsed.verbose) parsed.verbose = String(index + 1)
  if (parsed.sortFieId == null) parsed.sortFieId = index + 1

  return JSON.stringify(parsed)
}

/**
 * 定位损坏的字符串字段的键名起始索引。
 * 检测以下三种字符串相关的截断情形：
 * 1. 字符串值未闭合（文件结束）
 * 2. 字符串值中未转义引号提前结束，且后续不是合法的分隔符（`,`, `}`, `]`）
 * 3. 字符串值正常闭合，但文件结束或缺少必要的后续符号
 *
 * 若截断发生在数字、布尔值或结构体上，则返回 -1，由外层抛出原始错误。
 *
 * @param text - 待检查的字符串片段
 * @returns 损坏字段键名起始索引（含开头的双引号），若未找到则返回 -1
 */
const findBrokenStringKeyIndex = (text: string): number => {
  let inString = false
  let escaped = false
  let expectKey = false
  let inValueString = false
  let lastKeyStart = -1

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]

    if (escaped) {
      escaped = false
      continue
    }
    if (ch === '\\') {
      escaped = true
      continue
    }

    if (ch === '"') {
      inString = !inString
      if (inString) {
        if (expectKey) {
          lastKeyStart = i
          inValueString = false
          expectKey = false
        } else {
          inValueString = true
        }
      } else {
        if (inValueString) {
          inValueString = false
          const next = nextNonWs(text, i + 1)
          if (next >= text.length) return lastKeyStart
          const nextChar = text[next]
          if (nextChar !== ',' && nextChar !== '}' && nextChar !== ']') {
            return lastKeyStart
          }
        }
      }
      continue
    }

    if (inString) continue

    if (/\s/.test(ch)) continue

    if (ch === '{') {
      expectKey = true
      continue
    }
    if (ch === ',') {
      expectKey = true
      continue
    }
    if (ch === '[' || ch === '}' || ch === ']') {
      expectKey = false
      continue
    }
    if (ch === ':') {
      expectKey = false
      continue
    }

    expectKey = false
  }

  if (inString && lastKeyStart >= 0) {
    return lastKeyStart
  }

  return -1
}

/**
 * 从指定位置开始查找下一个非空白字符的索引。
 *
 * @param text - 待查找的字符串
 * @param from - 起始搜索位置
 * @returns 第一个非空白字符的索引，若超出长度则返回 text.length
 */
const nextNonWs = (text: string, from: number): number => {
  let i = from
  while (i < text.length && /\s/.test(text[i])) i++
  return i
}

/**
 * 补全字符串中未闭合的括号（`{}` 和 `[]`）。
 * 忽略字符串内的括号，正确处理转义字符。
 *
 * @param text - 可能缺少闭合括号的 JSON 片段
 * @returns 补全括号后的字符串
 */
const closeBrackets = (text: string): string => {
  let inString = false
  let escaped = false
  const stack: string[] = []

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (escaped) {
      escaped = false
      continue
    }
    if (ch === '\\') {
      escaped = true
      continue
    }
    if (ch === '"') {
      inString = !inString
      continue
    }
    if (inString) continue

    if (ch === '{' || ch === '[') stack.push(ch)
    else if ((ch === '}' || ch === ']') && stack.length) stack.pop()
  }

  let result = text
  while (stack.length) {
    result += stack.pop() === '{' ? '}' : ']'
  }
  return result
}

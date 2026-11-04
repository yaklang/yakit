/**
 * `@` / `/` 共用：触发符只在行首或空白后生效。
 * 正则 lookbehind 不消耗空白，删除区间只含触发符和筛选词。
 *
 * 每次返回新实例，且不加 g。`String#match` 无 g 时从 0 匹配，没有 lastIndex 复用问题。
 * 不要给该正则加 g，否则 match 只返回完整匹配数组、丢失捕获组，筛选词提取会失效。
 */
export function createTriggerQueryReg(trigger: string): RegExp {
  const escaped = trigger.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`(?<=^|\\s)${escaped}([^\\s]*)$`)
}

/** 无匹配返回 null；只有触发符时返回空串。 */
export function extractTriggerFilterKeyword(reg: RegExp, content: string | null | undefined): string | null {
  if (content == null) return null
  const match = content.match(reg)
  if (!match) return null
  return match[1] || ''
}

/**
 * 选中后应删除的触发区间 `[from, to)`。无匹配返回 null。
 * `textBefore` 须在段落之间插入换行，否则上一段会和本行行首的触发符粘在一起。
 */
export function getTriggerQueryDeleteRange(
  reg: RegExp,
  cursorFrom: number,
  textBefore: string,
): { from: number; to: number } | null {
  const queryMatch = textBefore.match(reg)
  if (!queryMatch) return null
  return { from: cursorFrom - queryMatch[0].length, to: cursorFrom }
}

export type TextBetweenDoc = {
  textBetween: (from: number, to: number, blockSeparator?: string, leafText?: string) => string
}

/** 光标前文本。块之间用换行隔开，保证新段落行首的触发符仍能被识别。 */
export function triggerTextBeforeCursor(doc: TextBetweenDoc, cursorFrom: number, lookbackChars: number): string {
  return doc.textBetween(Math.max(0, cursorFrom - lookbackChars), cursorFrom, '\n', '\uFFFC')
}

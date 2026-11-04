/**
 * `/` 仅在行首或空白后视为模式触发（排除 URL path、`http://` 等）。
 * lookbehind 不消耗空白，删除区间只含 `/query`。
 */
export const MODE_SLASH_QUERY_REG = /(?<=^|\s)\/([^\s]*)$/

/**
 * 从编辑器 slash content / 光标前文中提取 / 后的筛选词。
 * 无匹配返回 null；仅 `/` 时返回空串。
 */
export function extractModeSlashFilterKeyword(content: string | null | undefined): string | null {
  if (content == null) return null
  const match = content.match(MODE_SLASH_QUERY_REG)
  if (!match) return null
  return match[1] || ''
}

/**
 * 计算选中模式项时应删除的 `/query` 区间 `[from, to)`。
 * 无匹配返回 null（不删任何字符）。
 */
export function getModeSlashQueryDeleteRange(
  cursorFrom: number,
  textBefore: string,
): { from: number; to: number } | null {
  const queryMatch = textBefore.match(MODE_SLASH_QUERY_REG)
  if (!queryMatch) return null
  return { from: cursorFrom - queryMatch[0].length, to: cursorFrom }
}

/** @ 后允许紧跟筛选字符，遇空白结束 */
export const MENTION_QUERY_REG = /@([^\s]*)$/

/**
 * 从编辑器 slash content / 光标前文中提取 @ 后的筛选词。
 * 无匹配返回 null；仅 `@` 时返回空串。
 */
export function extractMentionFilterKeyword(content: string | null | undefined): string | null {
  if (content == null) return null
  const match = content.match(MENTION_QUERY_REG)
  if (!match) return null
  return match[1] || ''
}

/**
 * 计算选中 mention 时应删除的 `@query` 区间 `[from, to)`。
 * 无匹配返回 null（不删任何字符）。
 */
export function getMentionQueryDeleteRange(
  cursorFrom: number,
  textBefore: string,
): { from: number; to: number } | null {
  const queryMatch = textBefore.match(MENTION_QUERY_REG)
  if (!queryMatch) return null
  return { from: cursorFrom - queryMatch[0].length, to: cursorFrom }
}

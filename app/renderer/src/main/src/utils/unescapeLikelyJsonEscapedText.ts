/**
 * 模型偶发把整段源码写成字面 `\n`/`\t`/`\"`（单行 payload）。
 * 仅在「整段 JSON 字符串」或「无真实换行且转义换行 ≥ 2」时解义，避免把正则/字符串里的单个 `\n` 拆成换行。
 */
export function unescapeLikelyJsonEscapedText(raw: string): string {
  const s = String(raw ?? '')
  if (!s.includes('\\n') && !s.includes('\\t') && !s.includes('\\"')) return s

  const trimmed = s.trim()
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    try {
      const parsed = JSON.parse(trimmed)
      if (typeof parsed === 'string') return parsed
    } catch {
      /* fall through */
    }
  }

  const realNl = (s.match(/\n/g) || []).length
  const escapedNl = (s.match(/\\n/g) || []).length
  if (realNl > 0 || escapedNl < 2) return s

  return s
    .replace(/\\r\\n/g, '\n')
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, '\t')
    .replace(/\\r/g, '\r')
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\')
}

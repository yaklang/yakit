/**
 * 模型偶发把源码写成字面 `\n`/`\t`/`\"`（整段单行）。
 * 当转义换行明显多于真实换行时，解成真正的多行文本。
 */
export function unescapeLikelyJsonEscapedText(raw: string): string {
  const s = String(raw ?? '')
  if (!s.includes('\\n') && !s.includes('\\t') && !s.includes('\\"')) return s

  const realNl = (s.match(/\n/g) || []).length
  const escapedNl = (s.match(/\\n/g) || []).length
  if (escapedNl === 0 || realNl >= escapedNl) return s

  const trimmed = s.trim()
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    try {
      const parsed = JSON.parse(trimmed)
      if (typeof parsed === 'string') return parsed
    } catch {
      /* fall through */
    }
  }

  return s
    .replace(/\\r\\n/g, '\n')
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, '\t')
    .replace(/\\r/g, '\r')
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\')
}

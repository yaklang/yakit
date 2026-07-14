/**
 * AI Tool / Focus 双语展示名选择（与 yaklang 契约对齐）。
 *
 * 规则：
 * - zh*  -> verboseNameZh || verboseName || name
 * - en/其他 -> verboseName || verboseNameZh || name
 *
 * @see yaklang docs/design/ai-tool-bilingual-verbose-name.md
 */

export const isZhLanguage = (lang?: string): boolean => {
  if (!lang) return false
  const normalized = lang.toLowerCase()
  return normalized === 'zh' || normalized === 'zh-cn' || normalized === 'zh-tw' || normalized.startsWith('zh')
}

export interface BilingualVerboseNameInput {
  lang?: string
  /** 内部名 / 注册名，如 read_file */
  name?: string
  /** 英文展示名 (__VERBOSE_NAME__) */
  verboseName?: string
  /** 中文展示名 (__VERBOSE_NAME_ZH__) */
  verboseNameZh?: string
}

export const pickBilingualVerboseName = (input: BilingualVerboseNameInput): string => {
  const name = (input.name || '').trim()
  const en = (input.verboseName || '').trim()
  const zh = (input.verboseNameZh || '').trim()
  if (isZhLanguage(input.lang)) {
    return zh || en || name
  }
  return en || zh || name
}

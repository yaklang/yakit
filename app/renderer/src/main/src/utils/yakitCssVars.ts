/**
 * 提取所有 yakit / Colors-Use CSS 变量（包含继承 & inline）
 *
 * 此模块为纯 DOM 工具，不依赖 monaco-editor，可在任何位置安全导入，
 * 避免从 monacoSpec/theme.ts 间接拉入 monaco-editor ESM。
 */
export const getAllYakitColorVars = (theme?: 'light' | 'dark'): Record<string, string> => {
  const el = document.documentElement

  if (theme) {
    const currentTheme = el.getAttribute('data-theme')
    if (currentTheme !== theme) {
      console.warn(`[getAllYakitColorVars] theme mismatch: expect=${theme}, actual=${currentTheme}`)
    }
  }

  const computed = getComputedStyle(el)
  const seen = new Set<string>()
  const result: Record<string, string> = {}

  for (const sheet of document.styleSheets) {
    let rules: CSSRuleList
    try {
      rules = sheet.cssRules
    } catch {
      continue
    }

    for (const rule of rules) {
      if (rule.type !== CSSRule.STYLE_RULE) continue
      const styleRule = rule as CSSStyleRule

      for (let i = 0; i < styleRule.style.length; i++) {
        const prop = styleRule.style[i]
        if ((prop.startsWith('--Colors-Use-') || prop.startsWith('--yakit-colors-')) && !seen.has(prop)) {
          seen.add(prop)
          const value = computed.getPropertyValue(prop).trim()
          if (value) result[prop] = value
        }
      }
    }
  }

  for (let i = 0; i < el.style.length; i++) {
    const prop = el.style[i]
    if ((prop.startsWith('--Colors-Use-') || prop.startsWith('--yakit-colors-')) && !seen.has(prop)) {
      seen.add(prop)
      const value = computed.getPropertyValue(prop).trim()
      if (value) result[prop] = value
    }
  }

  return result
}

/** 主题色 CSS 变量常量 */
export const THEME_PRIMARY_COLOR = 'var(--Colors-Use-Main-Primary)'
export const THEME_BORDER_COLOR = 'var(--Colors-Use-Main-Border)'
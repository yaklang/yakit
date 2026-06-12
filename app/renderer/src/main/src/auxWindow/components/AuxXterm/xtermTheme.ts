/** aux 专用：读取 CSS 变量生成 xterm theme，避免引入 monaco 相关模块 */
function getAuxYakitColorVars(): Record<string, string> {
  const el = document.documentElement
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

export const getXtermTheme = () => {
  const vars = getAuxYakitColorVars()
  return {
    foreground: vars['--Colors-Use-Neutral-Text-1-Title'],
    background: vars['--Colors-Use-Neutral-Bg'],
    cursor: vars['--Colors-Use-Main-Primary'],
    cursorAccent: vars['--Colors-Use-Neutral-Bg'],
    selectionBackground: vars['--Colors-Use-Main-Focus'],
    selectionForeground: vars['--Colors-Use-Neutral-Text-1-Title'],
    selectionInactiveBackground: vars['--Colors-Use-Neutral-Disable'],
    black: vars['--Colors-Use-Neutral-Bg'],
    red: vars['--Colors-Use-Error-Primary'],
    green: vars['--yakit-colors-Green-80'],
    yellow: vars['--yakit-colors-Orange-80'],
    blue: vars['--yakit-colors-Blue-80'],
    magenta: vars['--yakit-colors-Magenta-80'],
    cyan: vars['--yakit-colors-Lake-blue-80'],
    white: vars['--Colors-Use-Neutral-Text-1-Title'],
    brightBlack: vars['--Colors-Use-Neutral-Disable'],
    brightRed: vars['--yakit-colors-Error-80'],
    brightGreen: vars['--yakit-colors-Green-100'],
    brightYellow: vars['--yakit-colors-Orange-100'],
    brightBlue: vars['--yakit-colors-Blue-100'],
    brightMagenta: vars['--yakit-colors-Magenta-100'],
    brightCyan: vars['--yakit-colors-Lake-blue-100'],
    brightWhite: vars['--Colors-Use-Neutral-Text-1-Title'],
    extendedAnsi: [
      vars['--Colors-Use-Neutral-Bg'],
      vars['--Colors-Use-Neutral-Bg-Hover'],
      vars['--Colors-Use-Neutral-Disable'],
      vars['--Colors-Use-Neutral-Border'],
      vars['--yakit-colors-Blue-80'],
      vars['--yakit-colors-Green-80'],
      vars['--yakit-colors-Orange-80'],
      vars['--yakit-colors-Error-80'],
      vars['--yakit-colors-Blue-100'],
      vars['--yakit-colors-Magenta-80'],
      vars['--yakit-colors-Lake-blue-80'],
      vars['--yakit-colors-Green-100'],
      vars['--yakit-colors-Orange-100'],
      vars['--yakit-colors-Error-100'],
      vars['--Colors-Use-Blue-Primary'],
      vars['--Colors-Use-Main-Primary'],
    ],
  }
}

import { generateColors } from '@yakit-libs/color'
import type { ColorHex, ThemeMode } from '@yakit-libs/color'

const VAR_REF_PATTERN = /^var\((--[^)]+)\)$/

export function resolveYakitColorVars(colors: Record<string, string>): Record<string, string> {
  const resolved: Record<string, string> = { ...colors }

  for (let pass = 0; pass < 10; pass++) {
    let changed = false

    for (const [key, value] of Object.entries(resolved)) {
      const match = value.match(VAR_REF_PATTERN)
      if (!match) continue

      const refValue = resolved[match[1]]
      if (refValue && !refValue.startsWith('var(')) {
        resolved[key] = refValue
        changed = true
      }
    }

    if (!changed) break
  }

  return resolved
}

export function getYakitColorVars(theme: ThemeMode, mainColorOverride?: ColorHex): Record<string, string> {
  return resolveYakitColorVars(generateColors(theme, mainColorOverride))
}

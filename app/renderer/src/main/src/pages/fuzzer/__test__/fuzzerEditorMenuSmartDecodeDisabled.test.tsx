import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/**
 * disabled editor only mounts shade (z-index 999) and blurs via fake input; Monaco is not set readOnly.
 * SmartDecode float portals into the wrapper at z-index 1050, so it stacks above the shade and Replace still writes.
 * Contract: when disabled, close and do not render SmartDecode (prefer over lowering float below shade).
 */
const here = path.dirname(fileURLToPath(import.meta.url))
const yakitEditorSrc = readFileSync(
  path.resolve(here, '../../../components/yakitUI/YakitEditor/YakitEditor.tsx'),
  'utf8',
)
const shadeScss = readFileSync(
  path.resolve(here, '../../../components/yakitUI/YakitEditor/YakitEditor.module.scss'),
  'utf8',
)
const smartDecodeScss = readFileSync(path.resolve(here, '../HTTPFuzzerEditorMenu.module.scss'), 'utf8')

describe('YakitEditor SmartDecode vs disabled', () => {
  it('documents shade below SmartDecode float (999 < 1050)', () => {
    expect(shadeScss).toMatch(/\.yakit-editor-shade\s*\{[\s\S]*?z-index:\s*999/)
    expect(smartDecodeScss).toMatch(/\.smart-decode-float-layer[\s\S]*?z-index:\s*1050/)
  })

  it('closes SmartDecode when disabled becomes true', () => {
    expect(yakitEditorSrc).toMatch(
      /useEffect\(\s*\(\)\s*=>\s*\{\s*if\s*\(\s*disabled\s*\)\s*setSmartDecode\(\s*null\s*\)/,
    )
  })

  it('does not render SmartDecodeFloatPanel while disabled', () => {
    expect(yakitEditorSrc).toMatch(/smartDecode\s*&&\s*!disabled\s*&&\s*\(/)
  })

  it('refuses to open SmartDecode while disabled', () => {
    expect(yakitEditorSrc).toMatch(/if\s*\(\s*disabled\s*\|\|\s*!rect\s*\)\s*return/)
  })
})

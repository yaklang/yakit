import { describe, expect, it } from 'vitest'
import { theme as antdTheme } from 'antd'
import { yakitAntdTheme } from '@/theme/antdTheme'
import { getAllYakitColorVars } from '@/utils/yakitColorVars'

describe('yakitAntdTheme', () => {
  it('seed colors come from the color system as hex so antd palette does not collapse to black', () => {
    const colors = getAllYakitColorVars()
    const primary = yakitAntdTheme.token?.colorPrimary
    expect(primary).toBe(colors['--Colors-Use-Main-Primary'])
    expect(primary).toMatch(/^#/)
    expect(primary).not.toBe('#000000')
    expect(String(primary)).not.toMatch(/^var\(/)

    const derived = antdTheme.getDesignToken(yakitAntdTheme)
    expect(derived.colorPrimary).not.toBe('#000000')
    expect(derived.colorPrimaryBg).not.toBe('#000000')
    expect(derived.colorSuccess).not.toBe('#000000')
    expect(derived.colorWarning).not.toBe('#000000')
    expect(derived.colorError).not.toBe('#000000')
  })
})

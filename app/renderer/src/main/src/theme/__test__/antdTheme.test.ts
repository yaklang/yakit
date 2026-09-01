import { describe, expect, it } from 'vitest'
import { theme as antdTheme } from 'antd'
import { getYakitAntdTheme } from '@/theme/antdTheme'
import { getAllYakitColorVars } from '@/utils/yakitColorVars'

describe('getYakitAntdTheme', () => {
  it('seed colors come from the color system as hex so antd palette does not collapse to black', () => {
    const yakitAntdTheme = getYakitAntdTheme()
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

  it('rebuilds seed hex for the requested theme instead of freezing module-load light', () => {
    const light = getYakitAntdTheme('light')
    const dark = getYakitAntdTheme('dark')
    expect(light.token?.colorPrimary).toBe(getAllYakitColorVars('light')['--Colors-Use-Main-Primary'])
    expect(dark.token?.colorPrimary).toBe(getAllYakitColorVars('dark')['--Colors-Use-Main-Primary'])
  })
})
